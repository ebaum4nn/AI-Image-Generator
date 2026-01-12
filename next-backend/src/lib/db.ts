import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res;
}

export async function getUsers(): Promise<any[]> {
  const res = await query('SELECT id, email, name, credits, role FROM users');
  return res.rows;
}

export async function saveImageGeneration(generation: {
	userEmail: string;
	prompt: string;
	imageUrl: string;
	width: number;
	height: number;
	steps: number;
	guidance: number;
	creditsUsed: number;
}): Promise<any> {
	// First get the user ID
	const users = await getUsers();
	const user = users.find((u: any) => u.email === generation.userEmail);
	if (!user) throw new Error('User not found');

	// Save directly to Postgres to avoid missing backend images route
	const insert = await query(
		'INSERT INTO image_generations (user_id, prompt, image_url, width, height, steps, guidance, credits_used) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
		[
			user.id,
			generation.prompt,
			generation.imageUrl,
			generation.width,
			generation.height,
			generation.steps,
			generation.guidance,
			generation.creditsUsed,
		]
	);
	return insert.rows[0];
}

export default { query };