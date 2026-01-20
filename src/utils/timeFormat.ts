export type TimeFormat = '12h' | '24h';

export function applyTimeFormat(hour: number, minute: number, format: TimeFormat): string {
	const mm = String(minute).padStart(2, '0');

	if (format === '12h') {
		const h = hour % 12 || 12;
		const ampm = hour < 12 ? 'AM' : 'PM';
		return `${h}:${mm} ${ampm}`;
	}

	return `${String(hour).padStart(2, '0')}:${mm}`;
}
