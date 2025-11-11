import { IDBFactory } from 'fake-indexeddb';

globalThis.indexedDB = new IDBFactory();
