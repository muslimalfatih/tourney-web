// Realistic demo data: a 32-team single-elimination knockout through Round of
// 32 → Round of 16 → Quarter-finals → Semi-finals → Final. Round of 32 is
// fully finished with real-looking scorelines (including one penalty
// shootout); Round of 16 is half finished / half upcoming; everything from
// Quarter-finals onward is upcoming with TBD sides, since those teams haven't
// been decided yet by the still-open earlier rounds.

import type { Match, Round, Team } from '$lib/types/bracket';

function team(id: string, name: string, code: string): Team {
	return { id, name, code };
}

const TEAMS: Team[] = [
	team('t1', 'Ridgemont FC', 'RID'),
	team('t2', 'Northaven United', 'NOR'),
	team('t3', 'Silverport City', 'SIL'),
	team('t4', 'Copper Hollow', 'COP'),
	team('t5', 'Aldergate Athletic', 'ALD'),
	team('t6', 'Fenwick Rovers', 'FEN'),
	team('t7', 'Brackenfield', 'BRA'),
	team('t8', 'Thornbury SC', 'THO'),
	team('t9', 'Millbrook Town', 'MIL'),
	team('t10', 'Eastcliff FC', 'EAS'),
	team('t11', 'Wychwood', 'WYC'),
	team('t12', 'Stonebridge', 'STO'),
	team('t13', 'Hartswell', 'HAR'),
	team('t14', 'Greymoor United', 'GRE'),
	team('t15', 'Ashcombe', 'ASH'),
	team('t16', 'Farrowgate', 'FAR'),
	team('t17', 'Kestrel Bay', 'KES'),
	team('t18', 'Ironmere', 'IRO'),
	team('t19', 'Dunmore City', 'DUN'),
	team('t20', 'Lowfield', 'LOW'),
	team('t21', 'Redshaw', 'RED'),
	team('t22', 'Vale Harbour', 'VAL'),
	team('t23', 'Oakenfold', 'OAK'),
	team('t24', 'Priorswood', 'PRI'),
	team('t25', 'Sandmere', 'SAN'),
	team('t26', 'Whitcombe', 'WHI'),
	team('t27', 'Blackfriar', 'BLA'),
	team('t28', 'Cragmoor', 'CRA'),
	team('t29', 'Elmswick', 'ELM'),
	team('t30', 'Hollowgate', 'HOL'),
	team('t31', 'Pemberton', 'PEM'),
	team('t32', 'Wrenfield', 'WRE')
];

// [homeScore, awayScore, penaltyHome?, penaltyAway?] — undefined penalties = no shootout.
const R32_RESULTS: [number, number, number?, number?][] = [
	[2, 0],
	[1, 3],
	[0, 0, 4, 3], // penalty shootout
	[2, 1],
	[1, 1, 2, 4], // penalty shootout
	[3, 2],
	[0, 1],
	[2, 2, 5, 4], // penalty shootout
	[1, 0],
	[0, 2],
	[3, 1],
	[1, 1, 3, 5], // penalty shootout
	[2, 0],
	[1, 2],
	[0, 3],
	[2, 1]
];

function r32Match(i: number): Match {
	const home = TEAMS[i * 2];
	const away = TEAMS[i * 2 + 1];
	const [hs, as_, hp, ap] = R32_RESULTS[i];
	const winner: Match['winner'] = hp != null ? (hp > (ap ?? 0) ? 'home' : 'away') : hs > as_ ? 'home' : 'away';
	return {
		id: `r32-m${i + 1}`,
		dateLabel: 'Jun 14',
		status: 'finished',
		home: { team: home, score: hs, penalties: hp ?? null },
		away: { team: away, score: as_, penalties: ap ?? null },
		winner
	};
}

const r32: Round = {
	id: 'round-of-32',
	name: 'Round of 32',
	matches: Array.from({ length: 16 }, (_, i) => r32Match(i))
};

function winnerOf(match: Match): Team {
	// Non-null by construction: every r32 match above has a decided winner.
	return (match.winner === 'home' ? match.home.team : match.away.team) as Team;
}

// Round of 16: first half already played, second half still to come — shows
// both a finished-card and an upcoming-card treatment in the same round.
const R16_FINISHED: [number, number][] = [
	[2, 1],
	[0, 1],
	[1, 1],
	[3, 0]
];

const r16: Round = {
	id: 'round-of-16',
	name: 'Round of 16',
	matches: [
		...R16_FINISHED.map(([hs, as_], i) => {
			const home = winnerOf(r32.matches[i * 2]);
			const away = winnerOf(r32.matches[i * 2 + 1]);
			return {
				id: `r16-m${i + 1}`,
				dateLabel: 'Jun 18',
				status: 'finished' as const,
				home: { team: home, score: hs },
				away: { team: away, score: as_ },
				winner: (hs > as_ ? 'home' : 'away') as Match['winner']
			};
		}),
		...Array.from({ length: 4 }, (_, j) => {
			const i = j + 4;
			const home = winnerOf(r32.matches[i * 2]);
			const away = winnerOf(r32.matches[i * 2 + 1]);
			return {
				id: `r16-m${i + 1}`,
				dateLabel: 'Jun 19',
				timeLabel: `${17 + j}:00`,
				status: 'upcoming' as const,
				home: { team: home, score: null },
				away: { team: away, score: null },
				winner: null
			};
		})
	]
};

// From Quarter-finals on, only the sides that are already decided (fed by a
// *finished* Round of 16 match) are known; the rest are genuine TBD slots —
// this is what the spec calls out as "some TBD slots".
const decidedR16Winners = r16.matches
	.filter((m) => m.status === 'finished')
	.map((m) => winnerOf(m));

const qf: Round = {
	id: 'quarter-finals',
	name: 'Quarter-finals',
	matches: Array.from({ length: 4 }, (_, i) => ({
		id: `qf-m${i + 1}`,
		dateLabel: 'Jun 23',
		timeLabel: '19:00',
		status: 'upcoming' as const,
		home: { team: decidedR16Winners[i * 2] ?? null, score: null },
		away: { team: decidedR16Winners[i * 2 + 1] ?? null, score: null },
		winner: null
	}))
};

const sf: Round = {
	id: 'semi-finals',
	name: 'Semi-finals',
	matches: Array.from({ length: 2 }, (_, i) => ({
		id: `sf-m${i + 1}`,
		dateLabel: 'Jun 27',
		timeLabel: '19:00',
		status: 'upcoming' as const,
		home: { team: null, score: null },
		away: { team: null, score: null },
		winner: null
	}))
};

const final: Round = {
	id: 'final',
	name: 'Final',
	matches: [
		{
			id: 'final-m1',
			dateLabel: 'Jul 1',
			timeLabel: '18:00',
			status: 'upcoming',
			home: { team: null, score: null },
			away: { team: null, score: null },
			winner: null
		}
	]
};

export const mockBracketRounds: Round[] = [r32, r16, qf, sf, final];
