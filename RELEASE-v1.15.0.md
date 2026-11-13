# MyCar v1.15.0

Accesul la MyCar poate fi administrat din MyAppsAdmin: invitații directe, retrimitere, retragerea invitațiilor și retragerea accesului conturilor. Autentificarea comună și accesul la celelalte aplicații se păstrează.

Retragerea accesului este aplicată prin reguli restrictive peste politicile existente de proprietate. Sesiunile deja deschise pierd accesul la date; aplicația verifică starea la încărcare, la revenirea în prim-plan și periodic. Serviciile push nu mai livrează către conturi cu acces retras.

Datele mașinilor și evenimentele nu sunt șterse. Re-invitarea poate restabili accesul. Administratorul este protejat pe server. Utilizatorii MyCar existenți sunt păstrați.

Verificare: teste de serviciu și interfață, plus tranzacție SQL cu ROLLBACK pentru sesiuni revocate, blocarea scrierii, protecția administratorului, retrimitere concurentă și izolarea MyList/Auth. Testele nu trimit e-mailuri reale.
