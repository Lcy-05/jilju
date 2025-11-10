-- Export merchants and benefits data
COPY (
  SELECT * FROM merchants
) TO STDOUT WITH (FORMAT csv, HEADER true);
