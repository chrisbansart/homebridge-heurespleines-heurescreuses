# Homebridge Heures Pleines / Heures Creuses

[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-blueviolet?color=%23491F59&style=flat)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![npm](https://img.shields.io/npm/v/homebridge-heurespleines-heurescreuses)](https://www.npmjs.com/package/homebridge-heurespleines-heurescreuses)
[![npm](https://img.shields.io/npm/dt/homebridge-heurespleines-heurescreuses)](https://www.npmjs.com/package/homebridge-heurespleines-heurescreuses)

Le Plugin Homebridge Heures Pleines / Heures Creuses permet d'intégrer vos plages horaires tarifaires dans HomeKit (l'Application Maison) sous forme de "Détecteurs de Contact". Il permet de piloter votre consommation d'énergie et vos appareils connectés en fonction de vos créneaux d'heures creuses configurés par votre fournisseur d'électricité.

## Exemples d'automatisations dans l'app Maison

**Automatisations pendant les Heures Creuses :**

- Le détecteur Heures Creuses s'allume => Allumer le cumulus & Régler tous les radiateurs électriques en mode confort & Démarrer la charge de la voiture électrique

**Automatisations pendant les Heures Pleines :**

- Le détecteur Heures Pleines s'allume => Éteindre le cumulus & Réduire le chauffage électrique & Mettre en pause la charge de la voiture électrique

## Fonctionnalités

- **Affiche les périodes Heures Creuses et Heures Pleines** en tant que "Détecteurs de contact" dans HomeKit : 2 détecteurs au total.
- **Configuration flexible** : Définissez jusqu'à 2 créneaux d'heures creuses par jour selon votre contrat d'électricité.
- **Gestion automatique du passage de minuit** : Les créneaux peuvent chevaucher minuit (ex: 22h30 - 06h30).
- **Mise à jour automatique** : Les détecteurs changent d'état automatiquement aux heures configurées.
- **Personnalisation des noms** des détecteurs via la configuration.

## Installation

Via le moteur de recherche de plugin de Homebridge :

1. Rechercher "Heures Pleines Heures Creuses"
2. Cliquer sur "Installer"

Ou via la ligne de commande :

```bash
npm i -g homebridge-heurespleines-heurescreuses
```

## Configuration du plugin

Les options de configuration disponibles sont :

### Créneaux Heures Creuses

| Champ                                | Description                                                                                        | Valeur par défaut |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------- |
| `Heures creuses - créneau 1 - début` | Heure de début du premier créneau d'heures creuses (format HH:MM)                                  | `02:00`           |
| `Heures creuses - créneau 1 - fin`   | Heure de fin du premier créneau d'heures creuses (format HH:MM)                                    | `07:00`           |
| `Heures creuses - créneau 2 - début` | Heure de début du deuxième créneau d'heures creuses (format HH:MM). Utiliser 00:00 pour désactiver | `00:00`           |
| `Heures creuses - créneau 2 - fin`   | Heure de fin du deuxième créneau d'heures creuses (format HH:MM). Utiliser 00:00 pour désactiver   | `00:00`           |

### Noms personnalisés

| Champ                                | Description                                                  | Valeur par défaut  |
| ------------------------------------ | ------------------------------------------------------------ | ------------------ |
| `Nom de l'accessoire Heures Creuses` | Nom personnalisé pour le détecteur de contact Heures Creuses | `"Heures Creuses"` |
| `Nom de l'accessoire Heures Pleines` | Nom personnalisé pour le détecteur de contact Heures Pleines | `"Heures Pleines"` |

## Configuration des créneaux horaires

### Exemples de configurations courantes

**Configuration 8 heures de nuit (un seul créneau) :**

- Créneau 1 début : `22:30`
- Créneau 1 fin : `06:30`
- Créneau 2 début : `00:00` (désactivé)
- Créneau 2 fin : `00:00` (désactivé)

**Configuration 8 heures réparties (deux créneaux) :**

- Créneau 1 début : `02:00`
- Créneau 1 fin : `07:00`
- Créneau 2 début : `13:00`
- Créneau 2 fin : `16:00`

**Configuration heures creuses après minuit :**

- Créneau 1 début : `23:30`
- Créneau 1 fin : `07:30`
- Créneau 2 début : `00:00` (désactivé)
- Créneau 2 fin : `00:00` (désactivé)

### Notes importantes

- Le format des heures doit être **HH:MM** (ex: 02:00, 14:30, 22:00)
- Pour désactiver le créneau 2, mettez `00:00` pour le début ET la fin
- Les créneaux peuvent chevaucher minuit sans problème
- Le plugin gère automatiquement le fuseau horaire Europe/Paris

## Fonctionnement de la mise à jour des détecteurs

### Détecteur Heures Creuses (HC)

Le détecteur **Heures Creuses** s'active :

- Lorsque l'heure actuelle est comprise dans le créneau 1 **OU** le créneau 2
- Exemple : Si créneau 1 = 02:00-07:00 et créneau 2 = 13:00-16:00, le détecteur HC sera actif de 02:00 à 07:00 et de 13:00 à 16:00

### Détecteur Heures Pleines (HP)

Le détecteur **Heures Pleines** s'active :

- Pendant toutes les autres périodes (quand HC est inactif)
- C'est l'inverse logique du détecteur HC

### Changements d'état automatiques

- Les détecteurs changent d'état automatiquement aux heures de début et de fin de chaque créneau
- Le plugin calcule le prochain changement et planifie la mise à jour
- Au démarrage, le plugin détermine immédiatement l'état correct des détecteurs
- Les logs indiquent clairement l'état actuel et le prochain changement prévu

## Cas d'usage

### Optimisation de la consommation électrique

- **Chauffage eau chaude** : Activer le cumulus uniquement en HC
- **Charge véhicule électrique** : Démarrer automatiquement en HC
- **Appareils énergivores** : Lave-linge, lave-vaisselle, sèche-linge en HC
- **Chauffage électrique** : Mode confort en HC, mode éco en HP

### Automatisations avancées

- **Notifications** : "Les heures creuses commencent, lancez vos appareils"
- **Préparation** : Préchauffer certaines pièces juste avant la fin des HC
- **Économies** : Couper automatiquement les appareils non essentiels en HP
- **Stockage d'énergie** : Charger batteries/systèmes de stockage en HC

## Ressources

- [Homebridge](https://homebridge.io/)
- [Documentation sur les tarifs HP/HC](https://particulier.edf.fr/fr/accueil/gestion-contrat/options/heures-creuses.html)

## Dépannage

### Les détecteurs ne changent pas d'état

- Vérifiez que les heures sont au bon format HH:MM
- Vérifiez les logs Homebridge pour voir les heures de changement planifiées
- Redémarrez Homebridge après toute modification de configuration

### Le créneau 2 ne fonctionne pas

- Assurez-vous que début et fin sont différents de 00:00
- Vérifiez que les heures ne se chevauchent pas avec le créneau 1

### Les heures ne correspondent pas

- Le plugin utilise le fuseau horaire Europe/Paris
- Vérifiez l'heure système de votre serveur Homebridge

## Support

Pour toute question ou problème, ouvrez une [issue](https://github.com/chrisbansart/homebridge-heurespleines-heurescreuses/issues).

---

## Licence

GPLv3 © 2025 [Christophe Bansart](https://github.com/chrisbansart)
