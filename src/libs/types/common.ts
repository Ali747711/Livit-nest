import { ObjectId } from 'mongoose';

export interface P {
  [key: string]: any;
}

export interface StatisticModifier {
  _id: ObjectId;
  targetKey: string;
  modifier: number;
}
