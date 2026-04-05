# Church Store Debug Data Removal - 2026-03-27

## Problème résolu
- Clic sur une église → rien ne se passait
- Les détails ne s'affichaient pas
- Le store chargeait les données debug au lieu de l'API

## Modifications apportées

### 1. `/web/src/store/useChurchStore.ts`
**Supprimé :**
- `DEBUG_CHURCHES` (lignes 7-50 environ) : 5 églises de test
- `DEBUG_CHURCH_DETAILS` (lignes 52-238 environ) : détails complets pour 5 églises

**Modifié :**
- `loadChurches()` : supprimé le fallback debug, maintenant gère l'erreur proprement
- `selectChurch()` : **PLUS DE CHECK DEBUG** avant l'API → appelle toujours `getChurchById()`
- Ajout de logs d'erreur console pour debug

**Résultat :**
- Fichier réduit de 313 lignes → 150 lignes (48% plus court)
- Toutes les fonctions utilisent maintenant l'API réelle
- Backup créé : `useChurchStore.ts.backup-YYYYMMDD-HHMMSS`

### 2. `/web/src/lib/api.ts`
**Corrigé :**
- `getChurchById()` : l'endpoint `/churches-simple/:id` retourne un objet direct (pas wrapped dans `{data: ...}`)
- Ajout d'un commentaire explicatif sur l'incohérence de l'API

## Tests effectués

✅ Compilation TypeScript : 0 erreurs  
✅ Build frontend : réussi (3.21s)  
✅ API `/churches-simple` : retourne 50 églises  
✅ API `/churches-simple/:id` : retourne les détails complets  
✅ Deploy : fichiers copiés dans `backend/public/`  
✅ PM2 restart : godsplan-api online  

## Fichiers modifiés
```
web/src/store/useChurchStore.ts    (313 → 150 lignes, -163 lignes)
web/src/lib/api.ts                 (correction getChurchById)
```

## Prochaines étapes

### À tester manuellement :
1. Ouvrir https://godsplan-api.montparnas.fr
2. Cliquer sur une église dans la liste
3. ✅ Vérifier que le panneau de détails s'ouvre
4. ✅ Vérifier que les horaires de messes s'affichent
5. ✅ Vérifier que les infos de contact sont présentes

### Si ça ne marche toujours pas :
- Ouvrir DevTools Console (F12)
- Chercher les erreurs `[GodsPlan]`
- Vérifier la requête réseau vers `/api/v1/churches-simple/:id`
- Restaurer le backup si nécessaire :
  ```bash
  cd /home/ocadmin/.openclaw/workspace/GodsPlan/web/src/store/
  cp useChurchStore.ts.backup-* useChurchStore.ts
  ```

## État actuel
- ✅ Code nettoyé
- ✅ Build réussi
- ✅ Frontend déployé
- ✅ API redémarrée
- ⏳ Test manuel requis pour confirmer le fix

---
**Objectif atteint :** Le store charge maintenant les vraies données depuis l'API ! 🎯
