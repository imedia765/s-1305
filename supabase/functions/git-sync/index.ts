import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting git sync operation...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables')
      throw new Error('Server configuration error')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Invalid token')
    }

    console.log('User authenticated:', user.id)

    // Parse request body
    const { operation, repositoryId, customUrl } = await req.json()
    console.log('Processing git sync operation:', { operation, repositoryId, customUrl })

    if (!operation) {
      throw new Error('Operation type is required')
    }

    // Verify GitHub token exists
    const githubToken = Deno.env.get('GITHUB_PAT')
    if (!githubToken) {
      console.error('GitHub PAT not configured')
      throw new Error('GitHub token not configured')
    }

    // Get repository details if repositoryId is provided
    let repository = null
    if (repositoryId) {
      const { data, error: repoError } = await supabase
        .from('git_repositories')
        .select('*')
        .eq('id', repositoryId)
        .single()

      if (repoError) {
        console.error('Repository fetch error:', repoError)
        throw new Error('Failed to fetch repository details')
      }

      if (!data) {
        console.error('Repository not found:', repositoryId)
        throw new Error('Repository not found')
      }

      repository = data
      console.log('Found repository:', repository)
    }

    // Verify repository URL
    const repoUrl = customUrl || repository?.source_url
    if (!repoUrl) {
      console.error('No repository URL provided')
      throw new Error('Repository URL is required')
    }

    // Create log entry
    const { data: logEntry, error: logError } = await supabase
      .from('git_sync_logs')
      .insert({
        repository_id: repository?.id,
        operation_type: operation,
        status: 'started',
        created_by: user.id,
        message: `Starting ${operation} operation for ${repoUrl}`
      })
      .select()
      .single()

    if (logError) {
      console.error('Log creation error:', logError)
      throw new Error('Failed to create operation log')
    }

    // Verify repository access
    const repoPath = repoUrl.replace('https://github.com/', '').replace('.git', '')
    console.log('Checking repository access:', repoPath)
    
    const repoCheckResponse = await fetch(
      `https://api.github.com/repos/${repoPath}`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Supabase-Edge-Function'
        }
      }
    )

    if (!repoCheckResponse.ok) {
      const errorData = await repoCheckResponse.text()
      console.error('Repository check failed:', errorData)
      
      await supabase
        .from('git_sync_logs')
        .update({
          status: 'failed',
          message: `Repository access failed: ${errorData}`,
          error_details: errorData
        })
        .eq('id', logEntry.id)
      
      throw new Error(`Repository access failed: ${errorData}`)
    }

    // Update log with success
    await supabase
      .from('git_sync_logs')
      .update({
        status: 'completed',
        message: `Successfully verified access and prepared for ${operation} operation`
      })
      .eq('id', logEntry.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        repository: repository ? {
          ...repository,
          custom_url: customUrl || repository.custom_url
        } : null
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in git-sync:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})