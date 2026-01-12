
// All user data operations are now performed via backend API calls

import { Pool } from 'pg';

// Resolve backend base URL for both server and client contexts
function getApiBase(): string {
	const serverBase = process.env.BACKEND_URL; // e.g., http://backend-nextjs:3000 in docker
	const clientBase = process.env.NEXT_PUBLIC_BACKEND_URL; // e.g., http://localhost:3001
	return serverBase || clientBase || 'http://localhost:3001';
}

export async function getUsers(): Promise<any[]> {
	const base = getApiBase();
	const res = await fetch(`${base}/api/users`);
	if (!res.ok) throw new Error('Failed to fetch users');
	return res.json();
}

export async function addUser(user: { email: string; name: string; credits?: number }): Promise<any> {
	const base = getApiBase();
	const res = await fetch(`${base}/api/users`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(user),
	});
	if (!res.ok) throw new Error('Failed to add user');
	return res.json();
}

export async function deleteUser(id: number): Promise<any> {
	const base = getApiBase();
	const res = await fetch(`${base}/api/users/${id}`, {
		method: 'DELETE',
	});
	if (!res.ok) throw new Error('Failed to delete user');
	return res.json();
}

export async function getUserCredits(email: string): Promise<number> {
	const users = await getUsers();
	const user = users.find((u: any) => u.email === email);
	return user ? user.credits : 0;
}

export async function updateUserCredits(email: string, credits: number): Promise<boolean> {
	const users = await getUsers();
	const user = users.find((u: any) => u.email === email);
	if (!user) return false;
	
	const base = getApiBase();
	const res = await fetch(`${base}/api/users/${user.id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name: user.name, email: user.email, credits }),
	});
	return res.ok;
}

export async function getUserImageGenerations(email: string): Promise<any[]> {
	// First get the user ID
	const users = await getUsers();
	const user = users.find((u: any) => u.email === email);
	if (!user) return [];
	
	const base = getApiBase();
	const res = await fetch(`${base}/api/images?user_id=${user.id}`);
	if (!res.ok) throw new Error('Failed to fetch images');
	return res.json();
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

export async function trashImageGeneration(imageId: number, userEmail: string, ipAddress: string): Promise<boolean> {
	// First get the user ID
	const users = await getUsers();
	const user = users.find((u: any) => u.email === userEmail);
	if (!user) return false;
	
	const base = getApiBase();
	const res = await fetch(`${base}/api/images/${imageId}/trash`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			user_id: user.id,
			ip_address: ipAddress,
		}),
	});
	return res.ok;
}

// PostgreSQL direct query for auth
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res;
}