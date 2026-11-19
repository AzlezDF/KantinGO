-- Keep starter categories available when the schema was installed without its seed migration.
insert into public.categories (name, slug, icon_name) values
    ('Makanan Berat', 'makanan-berat', 'utensils'),
    ('Makanan Ringan', 'makanan-ringan', 'sandwich'),
    ('Minuman', 'minuman', 'cup-soda'),
    ('Jajanan', 'jajanan', 'cookie')
on conflict (slug) do nothing;
