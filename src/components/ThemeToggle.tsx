import { useEffect, useState, type CSSProperties } from 'react';
import SwitchImport from 'react-switch';

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

const switchIconStyle: CSSProperties = {
	display: 'flex',
	height: '100%',
	width: '100%',
	alignItems: 'center',
	justifyContent: 'center',
};

const SunTrackIcon = () => (
	<span aria-hidden="true" style={switchIconStyle}>
		<svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
			<circle cx="12" cy="12" r="4.2" fill="#f7bf3c" />
			<g stroke="#f6a21a" strokeLinecap="round" strokeWidth="1.8">
				<path d="M12 3v2" />
				<path d="M12 19v2" />
				<path d="M5.2 5.2 6.6 6.6" />
				<path d="M17.4 17.4 18.8 18.8" />
				<path d="M3 12h2" />
				<path d="M19 12h2" />
				<path d="M5.2 18.8 6.6 17.4" />
				<path d="M17.4 6.6 18.8 5.2" />
			</g>
		</svg>
	</span>
);

const MoonTrackIcon = () => (
	<span aria-hidden="true" style={switchIconStyle}>
		<svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
			<path
				d="M16.6 15.1A7.25 7.25 0 0 1 8.9 7.4 7.25 7.25 0 1 0 16.6 15.1Z"
				fill="#c8d0ff"
			/>
			<path d="M17.6 4.2 18.2 5.5l1.3.6-1.3.6-.6 1.3-.6-1.3-1.3-.6 1.3-.6.6-1.3Z" fill="#8ea2ff" />
			<path d="M20.2 10.3 20.5 11l.7.3-.7.3-.3.7-.3-.7-.7-.3.7-.3.3-.7Z" fill="#f7d46f" />
		</svg>
	</span>
);

const Switch = ((SwitchImport as unknown as { default?: typeof SwitchImport }).default ?? SwitchImport) as typeof SwitchImport;

export default function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>('light');
	const [isReady, setIsReady] = useState(false);
	const isDark = theme === 'dark';

	useEffect(() => {
		const resolvedTheme = getTheme();
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		applyTheme(resolvedTheme);
		setTheme(resolvedTheme);
		setIsReady(true);

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

	const handleChange = (checked: boolean) => {
		const nextTheme: Theme = checked ? 'dark' : 'light';

		try {
			window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
		} catch {
			// Ignore storage failures and keep the selected theme for this page view.
		}

		applyTheme(nextTheme);
		setTheme(nextTheme);
	};

	return (
		<span style={{ display: 'inline-block', visibility: isReady ? 'visible' : 'hidden' }}>
			<Switch
				id="theme-toggle"
				className="theme-toggle"
				checked={isDark}
				onChange={handleChange}
				aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
				height={34}
				width={68}
				handleDiameter={30}
				borderRadius={17}
				offColor="#e9f2ff"
				onColor="#151a2d"
				offHandleColor="#ffffff"
				onHandleColor="#f8fbff"
				boxShadow="0 2px 8px rgba(15, 18, 25, 0.22)"
				activeBoxShadow="0 0 0 3px rgba(35, 55, 255, 0.32)"
				uncheckedIcon={<SunTrackIcon />}
				checkedIcon={<MoonTrackIcon />}
				uncheckedHandleIcon={false}
				checkedHandleIcon={false}
			/>
		</span>
	);
}