insert into "twitch_streamer" ("login", "display_name") values
  ('zenrll', 'Zen'),
  ('kaydop', 'Kaydop'),
  ('rocketleague', 'Rocket League')
on conflict ("login") do nothing;
