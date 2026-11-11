import { teacherApi } from '../../services/endpoints';
import useFetch from '../../hooks/useFetch';
import { PageHeader, Section } from '../../components/ui/misc';
import DifficultQuestions from '../../components/DifficultQuestions';

export default function DifficultQuestionsPage() {
  const { data } = useFetch(() => teacherApi.exams({ limit: 50 }), []);
  return (
    <>
      <PageHeader title="Most Difficult Questions" subtitle="Find out which questions your students struggle with, based on real attempt data." />
      <Section title="Questions ranked by incorrect answers">
        <DifficultQuestions limit={50} withFilters exams={data || []} />
      </Section>
    </>
  );
}
