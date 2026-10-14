-- ===========================================================================
-- SunuPermis — un élève à un seul endroit à la fois, et suppléments au forfait
-- ---------------------------------------------------------------------------
-- 1. Comme pour les moniteurs et les voitures, la base refuse deux leçons
--    du même élève sur le même créneau (sauf leçon annulée).
-- 2. Une échéance peut porter un libellé : c'est ainsi qu'un supplément
--    (heures en plus, nouvelle présentation à l'examen…) s'ajoute au forfait.
-- (Pas de DROP : appliquée telle quelle sur Supabase.)
-- ===========================================================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lessons_no_student_overlap') then
    alter table public.lessons add constraint lessons_no_student_overlap exclude using gist (
      student_id with =, tstzrange(starts_at, ends_at) with &&
    ) where (status <> 'cancelled');
  end if;
end;
$$;

alter table public.installments add column if not exists label text
  constraint installments_label_check check (label is null or char_length(label) between 1 and 80);
