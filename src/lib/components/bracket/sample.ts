import type { Bracket } from '$lib/api/types';

/**
 * Placeholder bracket used only until the backend draw endpoint returns real
 * data. It lets the custom renderer be seen and styled during the skeleton
 * phase. Remove once /public/events/:id/bracket is implemented (milestone 1).
 */
export const sampleBracket: Bracket = {
	event_id: 'sample',
	format: 'single_elim',
	rounds: [
		{
			round_number: 1,
			name: 'Quarterfinals',
			matches: [
				mkMatch('qf1', 'completed', [entry('A. Wibowo', 1, true), entry('R. Tanaka', 8)]),
				mkMatch('qf2', 'completed', [entry('L. Fernandez', 4), entry('M. Chen', 5, true)]),
				mkMatch('qf3', 'live', [entry('D. Putra', 3), entry('S. Kaur', 6)]),
				mkMatch('qf4', 'scheduled', [entry('J. Silva', 7), entry('K. Nakamura', 2)])
			]
		},
		{
			round_number: 2,
			name: 'Semifinals',
			matches: [
				mkMatch('sf1', 'pending', [entry('A. Wibowo', 1), entry('M. Chen', 5)]),
				mkMatch('sf2', 'pending', [tbd(), tbd()])
			]
		},
		{
			round_number: 3,
			name: 'Final',
			matches: [mkMatch('f1', 'pending', [tbd(), tbd()])]
		}
	]
};

function entry(name: string, seed: number, winner = false) {
	return { display_name: name, seed, winner };
}
function tbd() {
	return { display_name: null, seed: null, winner: false };
}

function mkMatch(
	id: string,
	status: Bracket['rounds'][number]['matches'][number]['status'],
	sides: { display_name: string | null; seed: number | null; winner: boolean }[]
) {
	const winnerId = sides[0].winner ? `${id}-p1` : sides[1].winner ? `${id}-p2` : null;
	return {
		id,
		status,
		court: null,
		scheduled_at: null,
		winner_participant_id: winnerId,
		participants: sides.map((s, i) => ({
			slot: (i + 1) as 1 | 2,
			participant_id: s.display_name ? `${id}-p${i + 1}` : null,
			display_name: s.display_name,
			seed: s.seed
		})),
		sets:
			status === 'completed'
				? [
						{ set_number: 1, p1_games: 6, p2_games: 3 },
						{ set_number: 2, p1_games: 6, p2_games: 4 }
					]
				: status === 'live'
					? [{ set_number: 1, p1_games: 4, p2_games: 5 }]
					: []
	};
}
