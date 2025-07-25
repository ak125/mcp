import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'MCP V2 Backend - Simple et efficace!';
  }
}
