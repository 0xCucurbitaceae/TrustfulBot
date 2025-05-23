CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    groupId TEXT
);


-- insert a row if none exist
INSERT INTO config (groupId) VALUES (NULL)
ON CONFLICT (id) DO NOTHING;
