-- 메시지 템플릿 테이블 생성 마이그레이션
-- Supabase SQL Editor에서 실행

-- message_templates 테이블 생성
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL UNIQUE, -- 'issuer' | 'workshop'
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_message_templates_type 
  ON public.message_templates(type);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_message_templates_updated_at ON public.message_templates;
CREATE TRIGGER trigger_update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_message_templates_updated_at();

-- 초기 템플릿 데이터 (선택사항)
-- INSERT INTO public.message_templates (type, content) VALUES
-- ('issuer', '[유리 교체 접수 안내]\n\n접수번호: {{접수번호}}\n차량번호: {{차량번호}}\n차종: {{차종}}\n작업부위: {{작업부위}}\n\n고객명: {{고객명}}\n연락처: {{연락처}}\n주소: {{사고위치}}\n\n옵션:\n- HUD: {{HUD}}\n- 차음유리: {{차음유리}}\n- 카메라 타입: {{카메라}}')
-- ON CONFLICT (type) DO NOTHING;

-- INSERT INTO public.message_templates (type, content) VALUES
-- ('workshop', '[유리 교체 작업 요청]\n\n접수번호: {{접수번호}}\n차량번호: {{차량번호}}\n차종: {{차종}}\n작업부위: {{작업부위}}\n\n고객 주소: {{사고위치}}\n고객 연락처: {{연락처}}\n\n옵션 정보:\n- HUD: {{HUD}}\n- 차음유리: {{차음유리}}\n- 카메라: {{카메라}}')
-- ON CONFLICT (type) DO NOTHING;

