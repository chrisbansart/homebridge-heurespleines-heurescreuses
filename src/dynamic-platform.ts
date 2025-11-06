import { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import moment from 'moment-timezone';

const PLUGIN_NAME = 'homebridge-heurespleines-heures-creuses';
const PLATFORM_NAME = 'HPHCPlatform';

interface TimeSlot {
  start: string; // HH:MM
  end: string;   // HH:MM
}

interface HPHCContext {
  name: string;
  type: 'HC' | 'HP';
}

class HPHCPlatform implements DynamicPlatformPlugin {
  private readonly accessories: Map<string, PlatformAccessory> = new Map();
  private readonly log: Logging;
  private readonly config: PlatformConfig;
  private readonly api: API;
  
  private timeSlot1: TimeSlot = { start: '00:00', end: '00:00' };
  private timeSlot2: TimeSlot = { start: '00:00', end: '00:00' };
  private currentStateHC: boolean = false;
  private currentStateHP: boolean = false;

  constructor(
    log: Logging,
    config: PlatformConfig,
    api: API,
  ) {
    this.log = log;
    this.config = config;
    this.api = api;

    // Récupération de la configuration des créneaux horaires
    this.timeSlot1.start = this.config.slot1Start || '02:00';
    this.timeSlot1.end = this.config.slot1End || '07:00';
    this.timeSlot2.start = this.config.slot2Start || '13:00';
    this.timeSlot2.end = this.config.slot2End || '16:00';

    this.log.info(`Créneau HC 1: ${this.timeSlot1.start} - ${this.timeSlot1.end}`);
    this.log.info(`Créneau HC 2: ${this.timeSlot2.start} - ${this.timeSlot2.end}`);

    this.api.on('didFinishLaunching', () => {
      this.initializeAccessories();
      this.updateAccessoriesState();
      this.scheduleNextUpdate();
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info(`Loading accessory from cache: ${accessory.displayName}`);
    this.accessories.set(accessory.UUID, accessory);
  }

  private initializeAccessories(): void {
    const accessoriesConfig = [
      { name: this.config.hcName || 'Heures Creuses', type: 'HC' as const },
      { name: this.config.hpName || 'Heures Pleines', type: 'HP' as const },
    ];

    const existingAccessories = Array.from(this.accessories.values());
    const keepAccessories = new Set<string>();

    accessoriesConfig.forEach(data => {
      const uuid = this.api.hap.uuid.generate(`hphc-${data.type}`);
      keepAccessories.add(uuid);

      let accessory = this.accessories.get(uuid);

      if (!accessory) {
        this.log.info(`Adding new accessory: ${data.name}`);
        accessory = new this.api.platformAccessory(data.name, uuid);
        this.setupAccessoryServices(accessory, data);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.set(uuid, accessory);
      } else {
        this.log.info(`Updating existing accessory: ${data.name}`);
        this.setupAccessoryServices(accessory, data);
      }
    });

    // Remove unused accessories
    existingAccessories
      .filter(accessory => !keepAccessories.has(accessory.UUID))
      .forEach(accessory => {
        this.log.info(`Removing unused accessory: ${accessory.displayName}`);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.delete(accessory.UUID);
      });
  }

  private setupAccessoryServices(accessory: PlatformAccessory, data: HPHCContext): void {
    const informationService = accessory.getService(this.api.hap.Service.AccessoryInformation) ||
      accessory.addService(this.api.hap.Service.AccessoryInformation);

    informationService
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'HomeBridge HP/HC')
      .setCharacteristic(this.api.hap.Characteristic.Model, `HP/HC ${data.type}`);

    const sensorService = accessory.getService(this.api.hap.Service.ContactSensor) ||
      accessory.addService(this.api.hap.Service.ContactSensor, data.name, `hphc-${data.type}`);

    sensorService
      .setCharacteristic(this.api.hap.Characteristic.Name, data.name)
      .setCharacteristic(this.api.hap.Characteristic.ConfiguredName, data.name);

    sensorService.getCharacteristic(this.api.hap.Characteristic.ContactSensorState)
      .onGet(() => {
        return data.type === 'HC' ? this.currentStateHC : this.currentStateHP;
      });

    accessory.context.hphc = data;
  }

  private isCurrentTimeHC(): boolean {
    const now = moment().tz('Europe/Paris');
    const currentTime = now.format('HH:mm');
    
    return this.isTimeInSlot(currentTime, this.timeSlot1) || 
           this.isTimeInSlot(currentTime, this.timeSlot2);
  }

  private isTimeInSlot(time: string, slot: TimeSlot): boolean {
    if (slot.start === slot.end) {
      return false; // Créneau désactivé
    }

    const [currentHour, currentMinute] = time.split(':').map(Number);
    const [startHour, startMinute] = slot.start.split(':').map(Number);
    const [endHour, endMinute] = slot.end.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Gestion du passage de minuit
    if (endMinutes < startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  }

  private updateAccessoriesState(): void {
    const isHC = this.isCurrentTimeHC();
    const isHP = !isHC;
    const now = moment().tz('Europe/Paris').format('HH:mm:ss');
    
    // Mise à jour des états internes
    this.currentStateHC = isHC;
    this.currentStateHP = isHP;
    
    this.log.info(`[${now}] Mise à jour: HC=${isHC ? 'ACTIF' : 'INACTIF'}, HP=${isHP ? 'ACTIF' : 'INACTIF'}`);

    // Mise à jour de chaque accessoire
    this.accessories.forEach(accessory => {
      const context = accessory.context.hphc as HPHCContext;
      const sensorService = accessory.getService(this.api.hap.Service.ContactSensor);
      
      if (sensorService) {
        if (context.type === 'HC') {
          sensorService
            .getCharacteristic(this.api.hap.Characteristic.ContactSensorState)
            .updateValue(this.currentStateHC);
          this.log.info(`${context.name} est ${this.currentStateHC ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
        } else if (context.type === 'HP') {
          sensorService
            .getCharacteristic(this.api.hap.Characteristic.ContactSensorState)
            .updateValue(this.currentStateHP);
          this.log.info(`${context.name} est ${this.currentStateHP ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
        }
      }
    });
  }

  private scheduleNextUpdate(): void {
    const now = moment().tz('Europe/Paris');
    
    // Trouver le prochain changement d'état
    const nextChangeMinutes = this.getNextChangeTime();
    
    if (nextChangeMinutes === null) {
      this.log.warn('Aucun créneau horaire valide configuré');
      return;
    }

    const nextUpdate = now.clone().startOf('day').add(nextChangeMinutes, 'minutes');
    
    if (now.isAfter(nextUpdate)) {
      nextUpdate.add(1, 'days');
    }

    const timeUntilNextUpdate = nextUpdate.diff(now);
    
    this.log.info(`Prochain changement dans ${Math.round(timeUntilNextUpdate / 60000)} minutes à ${nextUpdate.format('HH:mm')}`);

    setTimeout(() => {
      this.updateAccessoriesState();
      this.scheduleNextUpdate();
    }, timeUntilNextUpdate);
  }

  private getNextChangeTime(): number | null {
    const now = moment().tz('Europe/Paris');
    const currentMinutes = now.hours() * 60 + now.minutes();
    
    // Tous les moments de changement possibles dans la journée
    const changeTimes: number[] = [];
    
    if (this.timeSlot1.start !== this.timeSlot1.end) {
      changeTimes.push(this.timeToMinutes(this.timeSlot1.start));
      changeTimes.push(this.timeToMinutes(this.timeSlot1.end));
    }
    
    if (this.timeSlot2.start !== this.timeSlot2.end) {
      changeTimes.push(this.timeToMinutes(this.timeSlot2.start));
      changeTimes.push(this.timeToMinutes(this.timeSlot2.end));
    }
    
    if (changeTimes.length === 0) {
      return null;
    }
    
    // Trier les moments de changement
    changeTimes.sort((a, b) => a - b);
    
    // Trouver le prochain moment après l'heure actuelle
    for (const time of changeTimes) {
      if (time > currentMinutes) {
        return time;
      }
    }
    
    // Si aucun moment n'est trouvé, retourner le premier de la journée
    return changeTimes[0];
  }

  private timeToMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }
}

export = (api: API) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, HPHCPlatform);
};