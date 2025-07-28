SELECT
    concat('user_', toString(1000 + rand() % 9000)) AS user_id,
    5 + (rand() % 56) + rand() / 1000 AS game_duration,
    10 AS clicks,
    toDateTime('2025-07-25 00:00:00') - toIntervalMinute(rand() % (24 * 60 * 7)) AS timestamp, 
    concat('game_', toString(10000 + rand() % 90000)) AS game_id
FROM numbers(10)