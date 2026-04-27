-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS original_language text
  CHECK (original_language IN ('en','es','fr','pt','de','it','zh','ko','ja','sw','hi','ta','te','tl','ml'));
