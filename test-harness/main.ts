import 'reflect-metadata';
import 'zone.js';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { getRegisteredTypesWithFactories } from '@morgan-stanley/needle';

platformBrowserDynamic(getRegisteredTypesWithFactories())
    .bootstrapModule(AppModule)
    .catch((err) => console.error(err));
