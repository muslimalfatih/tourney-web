<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** "0" = off / eraser. "1" | "2" | "3" = increasing draw intensity. */
	export type PatternCell = '0' | '1' | '2' | '3';

	export interface LightBoardColors {
		background?: string;
		textDim?: string;
		textBright?: string;
		drawLine?: string;
	}

	// Theme tokens, not the reference component's raw hexes. better-colors:
	// reuse the project's existing semantic tokens rather than introducing a
	// second color representation for one component. The lit dots are
	// --color-primary (neutral) rather than --color-accent on purpose: accent
	// means "interactive" everywhere else in this app, and spending it on a
	// decorative marquee dilutes that meaning.
	const DEFAULT_COLORS: Required<LightBoardColors> = {
		background: 'var(--color-page)',
		textDim: 'var(--color-border)',
		textBright: 'var(--color-primary)',
		drawLine: 'var(--color-accent)'
	};

	const DRAW_OPACITY: Record<PatternCell, number> = { '0': 0, '1': 0.45, '2': 0.72, '3': 1 };

	const CHAR_HEIGHT = 7;

	// 5x7 dot-matrix font. "#" = lit pixel, "." = unlit. Module scope, so the
	// map is built once for the whole app rather than per component instance.
	const FONT_5X7: Record<string, string[]> = {
		' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
		A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
		B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
		C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
		D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
		E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
		F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
		G: ['.####', '#....', '#....', '#..##', '#...#', '#...#', '.####'],
		H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
		I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
		J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
		K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
		L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
		M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
		N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
		O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
		P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
		Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
		R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
		S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
		T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
		U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
		V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
		W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
		X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
		Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
		Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
		'0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
		'1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
		'2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
		'3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
		'4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
		'5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
		'6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
		'7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
		'8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
		'9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
		'!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
		'?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
		'.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
		',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
		"'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
		'-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....']
	};

	/** Flatten text into column-major bitmap columns, one trailing blank per char. */
	function buildMessageColumns(text: string): boolean[][] {
		const columns: boolean[][] = [];
		for (const char of text.toUpperCase()) {
			const glyph = FONT_5X7[char] ?? FONT_5X7[' '];
			for (let c = 0; c < glyph[0].length; c++) {
				const col: boolean[] = [];
				for (let r = 0; r < CHAR_HEIGHT; r++) col.push(glyph[r][c] === '#');
				columns.push(col);
			}
			columns.push(new Array(CHAR_HEIGHT).fill(false)); // inter-character spacing
		}
		return columns;
	}

	function makeGrid(rows: number, cols: number): PatternCell[][] {
		return Array.from({ length: rows }, () =>
			Array.from({ length: cols }, () => '0' as PatternCell)
		);
	}

	/** Preserve whatever the user has already drawn when the board is resized. */
	function resizeGrid(grid: PatternCell[][], rows: number, cols: number): PatternCell[][] {
		const next = makeGrid(rows, cols);
		for (let r = 0; r < Math.min(rows, grid.length); r++) {
			for (let c = 0; c < Math.min(cols, grid[r]?.length ?? 0); c++) next[r][c] = grid[r][c];
		}
		return next;
	}

	export type LightBoardProps = Omit<HTMLAttributes<HTMLDivElement>, 'color'> & {
		text?: string;
		rows?: number;
		gap?: number;
		lightSize?: number;
		updateInterval?: number;
		disableDrawing?: boolean;
		colors?: LightBoardColors;
		/** Pen intensity. Bindable — the Svelte equivalent of the React controlled prop + onChange pair. */
		drawState?: PatternCell;
		/** True while the pointer is over the board; scrolling pauses. Bindable. */
		hovered?: boolean;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { cn } from '$lib/utils/cn';

	let {
		text = '',
		rows = 10,
		gap = 2,
		lightSize = 5,
		updateInterval = 150,
		disableDrawing = true,
		colors,
		drawState = $bindable('1'),
		hovered = $bindable(false),
		class: className = '',
		...rest
	}: LightBoardProps = $props();

	const palette = $derived({ ...DEFAULT_COLORS, ...colors });
	const pitch = $derived(lightSize + gap);

	// Container-measured, not viewport-measured — same convention as
	// PagedKnockoutBracket, so the board stays correct inside a narrower panel.
	// 24 is the SSR/pre-mount sentinel; the ResizeObserver corrects on mount.
	let containerEl: HTMLDivElement | undefined = $state();
	let cols = $state(24);
	$effect(() => {
		if (!containerEl) return;
		const el = containerEl;
		const p = pitch;
		const g = gap;
		const measure = () => {
			cols = Math.max(1, Math.floor((el.clientWidth + g) / p));
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	});

	// A marquee is motion. Everything else in this app honors the preference,
	// so the scroll stops entirely and the board holds its first frame.
	let reducedMotion = $state(false);
	$effect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => (reducedMotion = mq.matches);
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	const messageColumns = $derived(buildMessageColumns(text));
	const loopLength = $derived(messageColumns.length + cols);
	const textBand = $derived(Math.floor((rows - CHAR_HEIGHT) / 2));

	// buildMessageColumns appends a blank spacer after every glyph including the
	// last, so the drawn width is one column short of the array length. Using
	// the raw length would park a centred message half a dot off.
	const glyphWidth = $derived(Math.max(0, messageColumns.length - 1));

	// A message that already fits holds still and sits centred; only one too
	// wide for the board scrolls. Without this a short title marches endlessly
	// across a half-empty board, which reads as a ticker rather than a sign.
	// Narrow viewports fall back to scrolling on their own, since `cols` is
	// measured — no breakpoint needed.
	const overflows = $derived(glyphWidth > cols);
	const staticPad = $derived(Math.max(0, Math.floor((cols - glyphWidth) / 2)));

	let offset = $state(0);
	$effect(() => {
		if (!text || !overflows || hovered || reducedMotion || loopLength === 0) return;
		const len = loopLength;
		const id = setInterval(() => {
			offset = (offset + 1) % len;
		}, updateInterval);
		return () => clearInterval(id);
	});

	// Deeply reactive: assigning drawGrid[r][c] updates only that cell's DOM,
	// so there is no per-stroke copy of the whole grid the way React needs.
	// Starts empty and is filled by the resize effect below — building it here
	// would only capture the initial rows/cols anyway.
	let drawGrid = $state<PatternCell[][]>([]);
	$effect(() => {
		const r = rows;
		const c = cols;
		untrack(() => {
			drawGrid = resizeGrid(drawGrid, r, c);
		});
	});

	let pointerDown = false;

	function paint(r: number, c: number) {
		if (drawGrid[r]?.[c] === undefined) return;
		drawGrid[r][c] = drawState;
	}

	// Delegated from the board root rather than bound per cell: one listener
	// pair instead of two per dot (~2800 on a full-width board), and it keeps
	// the interaction on an element that already carries a role.
	function cellAt(e: PointerEvent): [number, number] | null {
		const { r, c } = (e.target as HTMLElement)?.dataset ?? {};
		return r === undefined || c === undefined ? null : [+r, +c];
	}
	function onBoardPointerDown(e: PointerEvent) {
		if (disableDrawing) return;
		pointerDown = true;
		const cell = cellAt(e);
		if (cell) paint(...cell);
	}
	// Faithful to the reference: hovering paints too, not just dragging.
	function onBoardPointerOver(e: PointerEvent) {
		if (disableDrawing || !(pointerDown || hovered)) return;
		const cell = cellAt(e);
		if (cell) paint(...cell);
	}
	$effect(() => {
		const clear = () => (pointerDown = false);
		window.addEventListener('pointerup', clear);
		window.addEventListener('pointercancel', clear);
		return () => {
			window.removeEventListener('pointerup', clear);
			window.removeEventListener('pointercancel', clear);
		};
	});

	/** Read per cell in the template rather than rebuilding a rows x cols array
	 *  each tick — only the cells whose value actually changed touch the DOM. */
	function isLit(r: number, c: number): boolean {
		const fontRow = r - textBand;
		if (!text || fontRow < 0 || fontRow >= CHAR_HEIGHT) return false;
		if (!overflows) return messageColumns[c - staticPad]?.[fontRow] ?? false;
		if (loopLength === 0) return false;
		return messageColumns[(offset + c) % loopLength]?.[fontRow] ?? false;
	}
</script>

<!-- role="img" + aria-label: the grid is text rendered as graphics, so it
     announces once as a single labelled image instead of leaking ~1400 empty
     divs into the accessibility tree. Pass aria-hidden="true" from the call
     site when the same words already appear in an adjacent heading. -->
<div
	bind:this={containerEl}
	data-slot="lightboard"
	role="img"
	aria-label={text}
	class={cn('w-full touch-none select-none overflow-hidden rounded-md', className)}
	style:background-color={palette.background}
	style:padding="{gap}px"
	onpointerenter={() => (hovered = true)}
	onpointerleave={() => {
		hovered = false;
		pointerDown = false;
	}}
	onpointerdown={onBoardPointerDown}
	onpointerover={onBoardPointerOver}
	{...rest}
>
	<div
		class="grid"
		style:grid-template-columns="repeat({cols}, {lightSize}px)"
		style:grid-auto-rows="{lightSize}px"
		style:gap="{gap}px"
	>
		{#each { length: rows }, r (r)}
			{#each { length: cols }, c (c)}
				{@const drawLevel = DRAW_OPACITY[drawGrid[r]?.[c] ?? '0']}
				<div
					data-r={r}
					data-c={c}
					class={cn(
						'rounded-full transition-[opacity,background-color] duration-100 motion-reduce:transition-none',
						!disableDrawing && 'cursor-crosshair'
					)}
					style:background-color={drawLevel > 0
						? palette.drawLine
						: isLit(r, c)
							? palette.textBright
							: palette.textDim}
					style:opacity={drawLevel > 0 ? drawLevel : 1}
				></div>
			{/each}
		{/each}
	</div>
</div>
