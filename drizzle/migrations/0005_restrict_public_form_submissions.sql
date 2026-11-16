REVOKE INSERT ON public.requests FROM anon, authenticated;
GRANT INSERT (name, email, topic, message) ON public.requests TO anon, authenticated;
REVOKE INSERT ON public.subscribers FROM anon, authenticated;
GRANT INSERT (email) ON public.subscribers TO anon, authenticated;

ALTER POLICY "anyone sends requests" ON public.requests
WITH CHECK (
  char_length(btrim(name)) BETWEEN 1 AND 100
  AND char_length(email) BETWEEN 3 AND 254
  AND email = lower(btrim(email))
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND topic IN ('Song request', 'Order question', 'Restock alert', 'Shout-out on air', 'Something else')
  AND char_length(message) <= 2000
  AND created_at = CURRENT_TIMESTAMP
);

ALTER POLICY "anyone subscribes" ON public.subscribers
WITH CHECK (
  char_length(email) BETWEEN 3 AND 254
  AND email = lower(btrim(email))
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND created_at = CURRENT_TIMESTAMP
);
