import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';
const THEME_COLORS: Record<Theme, string> = {
	light: '#ffffff',
	dark: '#0f131d',
};

const isTheme = (value: string | null): value is Theme => value === 'light' || value === 'dark';

const getStoredTheme = (): Theme | null => {
	if (typeof window === 'undefined') return null;

	try {
		const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
		return isTheme(storedTheme) ? storedTheme : null;
	} catch {
		return null;
	}
};

const getSystemTheme = (): Theme => {
	if (typeof window === 'undefined') return 'light';

	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getTheme = (): Theme => getStoredTheme() ?? getSystemTheme();

const applyTheme = (theme: Theme) => {
	if (typeof document === 'undefined') return;

	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme = theme;
	document
		.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
		?.setAttribute('content', THEME_COLORS[theme]);
};

export default function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>(() => getTheme());
	const isDark = theme === 'dark';

	useEffect(() => {
		const resolvedTheme = getTheme();
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		applyTheme(resolvedTheme);
		setTheme(resolvedTheme);

		const handleSystemThemeChange = () => {
			if (getStoredTheme()) return;

			const nextTheme = getSystemTheme();
			applyTheme(nextTheme);
			setTheme(nextTheme);
		};

		mediaQuery.addEventListener('change', handleSystemThemeChange);

		return () => {
			mediaQuery.removeEventListener('change', handleSystemThemeChange);
		};
	}, []);

	const handleClick = () => {
		const nextTheme = theme === 'dark' ? 'light' : 'dark';

		try {
			window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
		} catch {
			// Ignore storage failures and keep the selected theme for this page view.
		}

		applyTheme(nextTheme);
		setTheme(nextTheme);
	};

	return (
		<button
			className="theme-toggle"
			type="button"
			aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			aria-pressed={isDark}
			onClick={handleClick}
		>
			<span className="theme-toggle__icon" aria-hidden="true">
				{isDark ? '🌙' : '☀️'}
			</span>
			<span className="theme-toggle__label">{isDark ? 'Dark' : 'Light'}</span>
		</button>
	);
}