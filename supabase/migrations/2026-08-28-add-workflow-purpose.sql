-- 为waitlists表添加workflow_purpose字段
-- 用于收集用户最关注的工作流场景

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'waitlists'
    AND column_name = 'workflow_purpose'
  ) THEN
    ALTER TABLE public.waitlists ADD COLUMN workflow_purpose TEXT DEFAULT NULL;
  END IF;
END $$;

-- 添加索引以支持按场景分析
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'waitlists'
    AND indexname = 'idx_waitlists_workflow_purpose'
  ) THEN
    CREATE INDEX idx_waitlists_workflow_purpose ON public.waitlists(workflow_purpose) WHERE workflow_purpose IS NOT NULL;
  END IF;
END $$;
