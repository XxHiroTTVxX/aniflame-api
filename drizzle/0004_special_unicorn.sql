ALTER TABLE "api_keys" 
ALTER COLUMN "whitelisted" TYPE boolean 
USING CASE 
    WHEN whitelisted = 'true' THEN TRUE 
    WHEN whitelisted = 'false' THEN FALSE 
    ELSE FALSE 
END;