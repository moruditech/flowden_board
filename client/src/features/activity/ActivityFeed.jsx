import { useInfiniteQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { activityApi } from '../../api/activity.api.js';
import { Header } from '../../components/layout/Header.jsx';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { formatRelative } from '../../utils/date.js';
import { useOrganization } from '../organizations/hooks/useOrganizations.js';

// ── Action labels ──────────────────────────────────────────────────────────────
const ACTION_LABEL = {
  'org.created':          'created this organization',
  'org.updated':          'updated organization settings',
  'member.invited':       'sent an invitation',
  'member.joined':        'joined the organization',
  'member.removed':       'removed a member',
  'member.role_changed':  'changed a member\'s role',
  'board.created':        'created a board',
  'board.updated':        'updated a board',
  'board.deleted':        'deleted a board',
  'task.created':         'created a task',
  'task.updated':         'updated a task',
  'task.moved':           'moved a task',
  'task.deleted':         'deleted a task',
  'task.assigned':        'assigned a task',
};

// ── useActivity ───────────────────────────────────────────────────────────────
export function useActivity(orgId, params = {}) {
  return useInfiniteQuery({
    queryKey:  ['activity', orgId, params],
    queryFn:   ({ pageParam = 1 }) =>
      activityApi.listByOrg(orgId, { page: pageParam, limit: 25, ...params })
        .then((r) => r.data.data),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta?.hasNextPage ? last.meta.page + 1 : undefined,
    enabled: !!orgId,
  });
}

// ── ActivityFeed ──────────────────────────────────────────────────────────────
export default function ActivityFeed() {
  const { orgId }   = useParams();
  const orgQuery    = useOrganization(orgId);
  const activityQ   = useActivity(orgId);

  const pages  = activityQ.data?.pages || [];
  const items  = pages.flatMap((p) => p.items || []);
  const total  = pages[0]?.meta?.total ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Activity" breadcrumb={orgQuery.data?.name} subtitle={`${total} events`} />

      <div className="flex-1 overflow-y-auto">
        {activityQ.isLoading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5 pt-0.5">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Actions taken in this organization will appear here."
          />
        ) : (
          <div className="p-6 max-w-2xl">
            {/* Group by date */}
            {items.map((item, idx) => {
              const actor    = item.actor;
              const prevItem = items[idx - 1];
              const sameDay  = prevItem &&
                new Date(item.createdAt).toDateString() === new Date(prevItem.createdAt).toDateString();

              return (
                <div key={item.id || item._id}>
                  {/* Date separator */}
                  {!sameDay && (
                    <div className="flex items-center gap-3 my-4 first:mt-0">
                      <div className="flex-1 h-px bg-zinc-100" />
                      <span className="text-2xs font-medium text-zinc-400 shrink-0">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric',
                        })}
                      </span>
                      <div className="flex-1 h-px bg-zinc-100" />
                    </div>
                  )}

                  {/* Activity item */}
                  <div className="flex items-start gap-3 py-2.5 border-b border-zinc-50 last:border-0">
                    <Avatar name={actor?.name} size="sm" className="shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-700 leading-snug">
                        <span className="font-medium text-zinc-900">{actor?.name || 'Someone'}</span>
                        {' '}
                        <span>{ACTION_LABEL[item.action] || item.action}</span>
                        {item.metadata?.taskTitle && (
                          <span className="text-zinc-500"> — <em className="not-italic font-medium text-zinc-700">"{item.metadata.taskTitle}"</em></span>
                        )}
                        {item.metadata?.name && !item.metadata?.taskTitle && (
                          <span className="text-zinc-500"> — <span className="font-medium text-zinc-700">"{item.metadata.name}"</span></span>
                        )}
                      </p>
                      <p className="text-2xs text-zinc-400 mt-0.5">{formatRelative(item.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load more */}
            {activityQ.hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button variant="ghost" size="sm"
                  onClick={() => activityQ.fetchNextPage()}
                  loading={activityQ.isFetchingNextPage}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
