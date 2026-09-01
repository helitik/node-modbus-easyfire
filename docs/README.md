# Documentation

## Contenu du dossier

- `README.md` (ce fichier) : synthèse des registres identifiés hors documentation KWB et méthode utilisée.
- `backups/` : dumps de la fenêtre mémoire Modbus (FC03, registres 0-16383) pris le 01/09/2026
  avant les premiers tests d'écriture, plus la paire avant/après du scan différentiel.
  Voir `backups/README.md`.

## Registres identifiés hors doc KWB

Tous ces registres sont lus en holding registers (FC03), valeurs int16.

| Registre  | Nom                                                | Signification                                                                                  | Statut                                                    |
| --------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1512      | HC1OperatingState                                  | Mode du circuit 1 : 0 = nuit, 1 = jour, 3 = arrêt (hors gel)                                   | Exposé dans `src/registerMap.js`                          |
| 1515      | HC1RoomReferenceActive                             | Consigne ambiante active, valeur ×10 (210 = 21,0 °C)                                           | Exposé dans `src/registerMap.js`                          |
| 4035      | Consigne ambiante jour                             | Valeur ×10. Passe de 210 à 220 quand la consigne jour passe de 21,0 à 22,0 sur le portail      | Localisé le 01/09/2026, pas encore dans `registerMap.js`  |
| 4036      | Consigne ambiante nuit                             | Valeur ×10 (190 = 19,0 °C)                                                                     | Idem                                                      |
| 2491-2494 | DHCW0Program, HC0Program, HC1Program, HC2Program   | Profil horaire actif (0 = Prog 1, 1 = Prog 2). Ce n'est pas le mode de fonctionnement          | Doc KWB feuille « write », exposés dans `registerMap.js`  |

Le banc ~1500 est celui lu par la webUI native de la chaudière. Le banc 4000+ semble être celui
des paramètres modifiables. Aucun de ces registres n'est garanti stable entre versions de
firmware KWB.

## Méthode : scan différentiel

1. `node tools/scan.js 4000 4100 avant` : premier snapshot, écrit dans `/tmp/kwb-scan-avant.txt`.
2. Changer un seul paramètre sur le portail ou la webUI, attendre une dizaine de secondes.
3. `node tools/scan.js 4000 4100 apres`.
4. `diff /tmp/kwb-scan-avant.txt /tmp/kwb-scan-apres.txt` : le registre qui bouge est celui cherché.

C'est cette méthode qui a localisé 4035 et 4036 (paire `backups/kwb-scan-avant-*` /
`backups/kwb-scan-apres-*`).

## Écriture : précautions

- Toujours faire un dump complet avant une campagne d'écriture (`node tools/scan.js 0 16383 dump`)
  et le ranger dans `backups/`.
- N'écrire qu'avec `tools/write-register.js`, qui relit le registre avant et après et n'écrit
  qu'avec `--yes`.
- N'écrire que sur des registres identifiés comme paramètres (banc 4000+), jamais sur des mesures.
- En cas de problème, ne restaurer que le paramètre écrit, à sa valeur d'origine lisible dans le
  dump. Les autres registres sont des mesures vivantes, non restaurables.
