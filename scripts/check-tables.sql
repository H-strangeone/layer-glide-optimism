SELECT 'Batches' as table_name, COUNT(*) as count FROM "Batch"
UNION ALL
SELECT 'BatchTransactions' as table_name, COUNT(*) as count FROM "BatchTransaction"; 