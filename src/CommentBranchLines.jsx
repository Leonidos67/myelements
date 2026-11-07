export function layoutCommentBranches(videos, summary) {
  const membersByFlow = new Map();
  videos.forEach((video, index) => {
    for (const id of summary?.[video._id]?.flowIds || []) {
      if (!membersByFlow.has(id)) membersByFlow.set(id, []);
      membersByFlow.get(id).push(index);
    }
  });

  const tracks = [...membersByFlow].filter(([, members]) => members.length > 1)
    .sort(([, a], [, b]) => a[0] - b[0] || b.at(-1) - a.at(-1));
  const laneEnds = [];
  const rows = new Map();
  for (const [id, members] of tracks) {
    const start = members[0];
    const end = members.at(-1);
    let lane = laneEnds.findIndex(lastEnd => lastEnd < start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    const endpoints = new Set(members);
    for (let index = start; index <= end; index++) {
      const segments = rows.get(videos[index]._id) || [];
      segments.push({ id, lane, start: index === start, end: index === end, connected: endpoints.has(index) });
      rows.set(videos[index]._id, segments);
    }
  }
  return { rows, laneCount: laneEnds.length };
}

export default function CommentBranchLines({ segments = [], laneCount }) {
  if (!segments.length) return null;
  return <span className="comment-branch-rail" style={{ width: 10 + laneCount * 8 }} aria-hidden="true">
    {segments.map(({ id, lane, start, end, connected }) => (
      <span key={id}
        className={'comment-branch-segment' + (start ? ' is-start' : end ? ' is-end' : '') + (connected ? ' is-connected' : '')}
        style={{ width: 8 + lane * 8, '--branch-color': ['#1688f0', '#506cfa', '#028db4'][lane % 3] }}
      />
    ))}
  </span>;
}
