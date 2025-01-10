import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    // Verify GitHub token exists
    const githubToken = Deno.env.get('GITHUB_PAT')
    if (!githubToken) {
      console.error('GitHub PAT not configured')
      throw new Error('GitHub token not configured')
    }

    const { operation, targetUrl } = await req.json()
    console.log('Processing git sync operation:', { operation, targetUrl })

    // Get master repository
    const { data: masterRepo, error: masterRepoError } = await supabase
      .from('git_repositories')
      .select('*')
      .eq('is_master', true)
      .single()

    if (masterRepoError || !masterRepo) {
      console.error('Master repository error:', masterRepoError)
      throw new Error('Master repository not found')
    }

    // Create or update custom repository record
    const { data: customRepo, error: customRepoError } = await supabase
      .from('git_repositories')
      .upsert({
        name: 'Custom Repository',
        source_url: masterRepo.source_url,
        target_url: targetUrl,
        branch: 'main',
        is_master: false,
        status: 'active'
      }, {
        onConflict: 'target_url'
      })
      .select()
      .single()

    if (customRepoError) {
      console.error('Custom repository error:', customRepoError)
      throw new Error('Failed to manage custom repository')
    }

    // Log operation start
    const { data: logEntry, error: logError } = await supabase
      .from('git_sync_logs')
      .insert({
        repository_id: customRepo.id,
        operation_type: operation,
        status: 'started',
        created_by: user.id,
        message: `Starting ${operation} operation between master and ${targetUrl}`
      })
      .select()
      .single()

    if (logError) {
      console.error('Log creation error:', logError)
      throw new Error('Failed to create operation log')
    }

    // Verify repository access
    const repoCheckResponse = await fetch(
      `https://api.github.com/repos/${targetUrl.replace('https://github.com/', '').replace('.git', '')}`,
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
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in git-sync:', error)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      await supabase
        .from('git_sync_logs')
        .insert({
          operation_type: 'sync',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          error_details: error instanceof Error ? error.stack : undefined
        })
    }

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