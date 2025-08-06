-- place it in public db function
create or replace function public.search_content_with_tags(
  search text,
  user_id uuid,
  type text default null,
  tags text[] default null,
  offset_val integer default 0,
  limit_val integer default 20
)
returns setof content
language plpgsql
as $$
begin
  return query
  select *
  from content
  where content.user_id = search_content_with_tags.user_id
    and (
      title ilike '%' || search_content_with_tags.search || '%'
      or content ilike '%' || search_content_with_tags.search || '%'
      or exists (
        select 1 from unnest(content.tags) as tag
        where tag ilike '%' || search_content_with_tags.search || '%'
      )
    )
    and (search_content_with_tags.type is null or content.type = search_content_with_tags.type)
    and (search_content_with_tags.tags is null or content.tags @> search_content_with_tags.tags)
  order by content.created_at desc
  offset search_content_with_tags.offset_val
  limit search_content_with_tags.limit_val;
end;