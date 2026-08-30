export async function useTeamByRouteSlug() {
  const route = useRoute();
  const slug = computed(() => route.params.slug as string);

  const { data, pending, error } = await useAsyncData(
    () => `team-${slug.value}`,
    () => getTeamFromSlug(slug.value),
    { watch: [slug] },
  );

  return {
    slug,
    team: data,
    teamId: computed(() => data.value?.id),
    pending,
    error,
  };
}
