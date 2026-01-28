-- Create activity_logs table for tracking all user actions
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_activity_logs_group_id ON public.activity_logs(group_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);

-- RLS Policy: Users can view activity logs in their groups
CREATE POLICY "Users can view activity logs in their groups"
ON public.activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = activity_logs.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- RLS Policy: Users can insert activity logs in their groups
CREATE POLICY "Users can insert activity logs in their groups"
ON public.activity_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = activity_logs.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Enable realtime for activity_logs only (expenses and balances already have realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;