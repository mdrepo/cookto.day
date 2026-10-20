-- Undoes 0003: the links and their functions.
drop function if exists msg_housekeeping(text, timestamptz);
drop function if exists msg_link_send_allowed(text, text, timestamptz);
drop function if exists msg_link_remove(text, text);
drop function if exists msg_link_status(text, text, timestamptz);
drop function if exists msg_link_connect(text, text, text, text, timestamptz);
drop function if exists msg_link_make(text, text, timestamptz);
drop function if exists msg_link_code();
drop table if exists link_requests;
drop table if exists links;
