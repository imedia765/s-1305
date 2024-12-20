CREATE OR REPLACE FUNCTION create_member_with_retry(
  p_member_number TEXT,
  p_full_name TEXT,
  p_email TEXT,
  max_retries INTEGER DEFAULT 3
)
RETURNS SETOF members
LANGUAGE plpgsql
AS $$
DECLARE
  v_retry_count INTEGER := 0;
  v_result members;
BEGIN
  WHILE v_retry_count < max_retries LOOP
    BEGIN
      INSERT INTO members (
        member_number,
        full_name,
        email,
        verified,
        profile_updated,
        email_verified,
        status
      )
      VALUES (
        p_member_number,
        p_full_name,
        p_email,
        true,
        false,
        true,
        'active'
      )
      RETURNING * INTO v_result;
      
      RETURN NEXT v_result;
      RETURN;
      
    EXCEPTION WHEN unique_violation THEN
      v_retry_count := v_retry_count + 1;
      IF v_retry_count >= max_retries THEN
        -- If we've exhausted retries, try to fetch existing record
        SELECT * INTO v_result
        FROM members
        WHERE member_number = p_member_number
        OR email = p_email
        LIMIT 1;
        
        IF FOUND THEN
          RETURN NEXT v_result;
          RETURN;
        ELSE
          RAISE EXCEPTION 'Failed to create or retrieve member after % attempts', max_retries;
        END IF;
      END IF;
      -- Add some randomness to help avoid collisions
      PERFORM pg_sleep(random() * 0.5);
    END;
  END LOOP;
END;
$$;