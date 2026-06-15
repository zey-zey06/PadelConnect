const repo = require('./feed.repository');

/**
 * Build the home feed for a user.
 * Connected mode (user has friends or followed teams):
 *   → team posts from followed teams + upcoming sessions from friends
 * Discovery mode (no connections):
 *   → all recent team posts + all upcoming public sessions + suggestions
 */
async function getFeed(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  // Parallel: connection count + stories data (always needed)
  const [connectionCount, friendStories, followedTeams] = await Promise.all([
    repo.getConnectionCount(userId),
    repo.getFriendsForStories(userId),
    repo.getFollowedTeams(userId),
  ]);

  const isEmpty = connectionCount === 0;
  let items = [];
  let suggestions = null;

  if (isEmpty) {
    // Discovery: all recent content
    const [teamPosts, sessions, clubs, teams] = await Promise.all([
      repo.getAllRecentTeamPosts(limit * 3),
      repo.getPublicUpcomingSessions(limit),
      repo.getSuggestedClubs(5),
      repo.getSuggestedTeams(5),
    ]);
    const merged = [...teamPosts, ...sessions].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
    items = merged.slice(offset, offset + limit);
    suggestions = { clubs, teams };
  } else {
    // Connected: personalised feed
    const fetchLimit = Math.max(limit * 4, 80); // over-fetch to have enough after merge
    const [teamPosts, sessions] = await Promise.all([
      repo.getFollowedTeamPosts(userId, fetchLimit),
      repo.getFriendSessions(userId, fetchLimit),
    ]);
    const merged = [...teamPosts, ...sessions].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
    items = merged.slice(offset, offset + limit);
  }

  // Enrich: attach liked=true/false for team_post items (single batch query)
  const postIds = items.filter((i) => i._type === 'team_post').map((i) => i.id);
  const likedSet = await repo.getLikedPostIds(userId, postIds);
  const enrichedItems = items.map((item) =>
    item._type === 'team_post' ? { ...item, liked: likedSet.has(item.id) } : item,
  );

  return {
    items: enrichedItems,
    page,
    has_more: items.length === limit,
    empty: isEmpty,
    stories: {
      friends: friendStories,
      teams: followedTeams,
    },
    ...(suggestions && { suggestions }),
  };
}

module.exports = { getFeed };
