-- ============================================================
-- NexaLMS Migration 00009: Exam Analytics Snapshot
-- ============================================================
-- When an exam is published, create an immutable analytics snapshot.
-- Every dashboard, report card, PDF, and export reads from that
-- snapshot rather than recalculating from raw marks each time.
-- This gives consistent results, much faster report generation,
-- and preserves historical analytics exactly as they were when
-- the exam was published—even if student or teacher records change later.
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_analytics_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id               UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  school_id             UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  snapshot_version      INTEGER NOT NULL DEFAULT 1,

  -- ── School-level metrics ─────────────────────────────────────
  school_mean           NUMERIC(6,2),
  school_mean_grade     TEXT,
  total_candidates      INTEGER DEFAULT 0,
  pass_rate             NUMERIC(5,2),       -- percentage
  fail_rate             NUMERIC(5,2),
  distinction_rate      NUMERIC(5,2),
  completion_rate       NUMERIC(5,2),       -- marks entry completion %

  -- ── Gender breakdown ─────────────────────────────────────────
  boys_mean             NUMERIC(6,2),
  girls_mean            NUMERIC(6,2),
  boys_count            INTEGER DEFAULT 0,
  girls_count           INTEGER DEFAULT 0,
  boys_pass_rate        NUMERIC(5,2),
  girls_pass_rate       NUMERIC(5,2),

  -- ── Rankings & special lists ─────────────────────────────────
  top_student_id        UUID REFERENCES students(id) ON DELETE SET NULL,
  bottom_student_id     UUID REFERENCES students(id) ON DELETE SET NULL,

  -- ── Aggregated JSON payloads (rich, pre-computed) ────────────
  -- Each key is a serialised analytics block for its level.

  -- Level 2: School
  school_metrics        JSONB,   -- grade distribution, counts, trends
  -- Level 3: Department
  department_metrics    JSONB,   -- [{dept_id, dept_name, mean, pass_rate, …}]
  -- Level 4: Subject
  subject_metrics       JSONB,   -- [{subject_id, name, mean, high, low, median, sd, …}]
  -- Level 5: Teacher
  teacher_metrics       JSONB,   -- [{teacher_id, name, candidates, mean, pass_rate, …}]
  -- Level 6: Class
  class_metrics         JSONB,   -- [{class_id, name, mean, position, grade_dist, …}]
  -- Level 7: Stream
  stream_metrics        JSONB,   -- [{stream_id, name, mean, rank, …}]
  -- Level 8: Student
  student_metrics       JSONB,   -- [{student_id, name, total, mean, position, subjects:[…]}]
  -- Level 9: Gender
  gender_metrics        JSONB,
  -- Level 10: Grade distribution
  grade_distribution    JSONB,   -- {"A":12, "B":24, "C":30, …}
  -- Level 11: Improvement
  improvement_metrics   JSONB,   -- most improved / biggest decline per entity
  -- Level 12: Target analysis
  target_metrics        JSONB,
  -- Level 13: Special lists
  special_lists         JSONB,   -- top10, top50, top100, straight_A, at_risk, …

  -- ── Coverage map (marks entry completeness per class+subject) ──
  coverage_map          JSONB,

  -- ── Metadata ──────────────────────────────────────────────────
  generated_at          TIMESTAMPTZ DEFAULT NOW(),
  generated_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(exam_id, school_id, snapshot_version)
);

-- ── Indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exam_snapshots_exam     ON exam_analytics_snapshots(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_snapshots_school   ON exam_analytics_snapshots(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_snapshots_gen_at   ON exam_analytics_snapshots(generated_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE exam_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view exam_analytics_snapshots"
  ON exam_analytics_snapshots FOR SELECT
  USING (school_id = get_my_school_id());

CREATE POLICY "School admin can insert exam_analytics_snapshots"
  ON exam_analytics_snapshots FOR INSERT
  WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "School admin can update exam_analytics_snapshots"
  ON exam_analytics_snapshots FOR UPDATE
  USING (school_id = get_my_school_id());

CREATE POLICY "School admin can delete exam_analytics_snapshots"
  ON exam_analytics_snapshots FOR DELETE
  USING (school_id = get_my_school_id());
