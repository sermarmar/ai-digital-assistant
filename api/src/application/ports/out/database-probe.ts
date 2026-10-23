export interface DatabaseProbe {
  isReachable(): Promise<boolean>;
}
