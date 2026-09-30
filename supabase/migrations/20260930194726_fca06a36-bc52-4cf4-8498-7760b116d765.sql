REVOKE ALL ON public.app_locks FROM anon, authenticated;
REVOKE ALL ON public.internal_job_tokens FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.recently_signed_in(integer) FROM authenticated;