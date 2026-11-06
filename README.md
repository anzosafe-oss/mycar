# MyCar

Interfață MyCar conectată la proiectul Supabase MySubs, schema separată `mycar`.

## Publicare
GitHub → Settings → Pages → Deploy from a branch → main → /(root).

## Utilizare
Autentificare cu emailul și parola contului Supabase din proiectul MySubs. Nu sunt înscrise date demo. Adaugă prima mașină din Mașini; apasă cardurile RCA/CASCO/ITP/Rovinietă pentru a salva scadențele. Mașinile, evenimentele și preferințele se păstrează în Supabase.

Cheia din cod este publishable (publică). Accesul la date se face prin Supabase Auth și politicile RLS. Nu introduceți chei service_role sau parole în repository.

Emailurile, Web Push, badge-urile și atașamentele nu sunt încă implementate. Comutatorul notificărilor salvează doar preferința.

Supabase JavaScript SDK 2.119.0 este inclus în vendor/; sursă: https://github.com/supabase/supabase-js (MIT).
