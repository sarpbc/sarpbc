export async function useTeamByRouteSlug() {
  const route = useRoute();

  const slug = computed(() => {
    const { slug: param } = route.params;

    return (Array.isArray(param) ? param[0] : param) ?? "";
  });

  const { data, pending, error, refresh } = await useAsyncData(
    () => `team-${slug.value}`,
    async () => await getTeamFromSlug(slug.value),
    { watch: [slug] },
  );

  return {
    slug,
    team: data,
    teamId: computed(() => data.value?.id),
    pending,
    error,
    refresh,
  };
}
