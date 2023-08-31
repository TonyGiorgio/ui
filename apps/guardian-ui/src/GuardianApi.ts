import { JsonRpcError, JsonRpcWebsocket } from 'jsonrpc-client-websocket';
import { ConfigGenParams, ConsensusState, PeerHashMap } from './setup/types';
import {
  AuditSummary,
  ConfigResponse,
  FederationStatus,
  ServerStatus,
  StatusResponse,
  Versions,
} from './types';

export interface SocketAndAuthInterface {
  // WebSocket methods
  connect(): Promise<JsonRpcWebsocket>;
  shutdown: () => Promise<boolean>;

  // Authentication methods
  getPassword: () => string | null;
  testPassword: (password: string) => Promise<boolean>;
}

interface RpcInterface {
  call: <T>(
    method: SetupRpc | AdminRpc | SharedRpc,
    params?: unknown
  ) => Promise<T>;
  // TODO: Consider moving this to `SocketAndAuthInterface` as part of the authentication methods.
  clearPassword: () => void;
}

enum SharedRpc {
  auth = 'auth',
  status = 'status',
}

interface SharedApiInterface {
  status: () => Promise<StatusResponse>;
}

const SESSION_STORAGE_KEY = 'guardian-ui-key';

class BaseGuardianApi
  implements SocketAndAuthInterface, RpcInterface, SharedApiInterface
{
  private websocket: JsonRpcWebsocket | null = null;
  private connectPromise: Promise<JsonRpcWebsocket> | null = null;

  /*** WebSocket methods ***/
  connect = async (): Promise<JsonRpcWebsocket> => {
    if (this.websocket !== null) {
      return this.websocket;
    }
    if (this.connectPromise) {
      return await this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      const websocketUrl = process.env.REACT_APP_FM_CONFIG_API;

      if (!websocketUrl) {
        throw new Error('REACT_APP_FM_CONFIG_API not set');
      }

      const requestTimeoutMs = 1000 * 60 * 60 * 5; // 5 minutes, dkg can take a while
      const websocket = new JsonRpcWebsocket(
        websocketUrl,
        requestTimeoutMs,
        (error: JsonRpcError) => {
          console.error('failed to create websocket', error);
          reject(error);
          this.shutdown();
        }
      );
      websocket
        .open()
        .then(() => {
          this.websocket = websocket;
          resolve(this.websocket);
        })
        .catch((error) => {
          console.error('failed to open websocket', error);
          reject(
            new Error(
              'Failed to connect to API, confirm your server is online and try again.'
            )
          );
        });
    });

    return this.connectPromise;
  };

  shutdown = async (): Promise<boolean> => {
    if (this.connectPromise) {
      this.connectPromise = null;
    }
    if (this.websocket) {
      const evt: CloseEvent = await this.websocket.close();
      this.websocket = null;
      return evt.type === 'close' && evt.wasClean;
    }

    return true;
  };

  getPassword = (): string | null => {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  };

  testPassword = async (password: string): Promise<boolean> => {
    // Replace with password to check.
    sessionStorage.setItem(SESSION_STORAGE_KEY, password);

    // Attempt a 'status' rpc call with the temporary password.
    try {
      await this.auth();
      return true;
    } catch (err) {
      // TODO: make sure error is auth error, not unrelated
      this.clearPassword();
      return false;
    }
  };

  /*** Shared RPC methods */
  auth = (): Promise<void> => {
    return this.call(SharedRpc.auth);
  };

  status = (): Promise<StatusResponse> => {
    return this.call(SharedRpc.status);
  };

  clearPassword = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  call = async <T>(
    method: SetupRpc | AdminRpc | SharedRpc,
    params: unknown = null
  ): Promise<T> => {
    return this.call_any_method(method, params);
  };

  call_any_method = async <T>(
    method: string,
    params: unknown = null
  ): Promise<T> => {
    try {
      const websocket = await this.connect();

      const response = await websocket.call(method, [
        {
          auth: this.getPassword() || null,
          params,
        },
      ]);

      if (response.error) {
        throw response.error;
      }

      const result = response.result as T;
      console.log(`${method} rpc result:`, result);

      return result;
    } catch (error: unknown) {
      console.error(`error calling '${method}' on websocket rpc : `, error);
      throw 'error' in (error as { error: JsonRpcError })
        ? (error as { error: JsonRpcError }).error
        : error;
    }
  };
}

// Setup RPC methods (only exist during setup)
enum SetupRpc {
  setPassword = 'set_password',
  setConfigGenConnections = 'set_config_gen_connections',
  getDefaultConfigGenParams = 'get_default_config_gen_params',
  getConsensusConfigGenParams = 'get_consensus_config_gen_params',
  setConfigGenParams = 'set_config_gen_params',
  getVerifyConfigHash = 'get_verify_config_hash',
  runDkg = 'run_dkg',
  verifiedConfigs = 'verified_configs',
  startConsensus = 'start_consensus',
}

export interface SetupApiInterface extends SharedApiInterface {
  setPassword: (password: string) => Promise<void>;
  setConfigGenConnections: (
    ourName: string,
    leaderUrl?: string
  ) => Promise<void>;
  getDefaultConfigGenParams: () => Promise<ConfigGenParams>;
  getConsensusConfigGenParams: () => Promise<ConsensusState>;
  setConfigGenParams: (params: ConfigGenParams) => Promise<void>;
  getVerifyConfigHash: () => Promise<PeerHashMap>;
  runDkg: () => Promise<void>;
  verifiedConfigs: () => Promise<void>;
  startConsensus: () => Promise<void>;
}

// Running RPC methods (only exist after run_consensus)
enum AdminRpc {
  version = 'version',
  fetchEpochCount = 'fetch_epoch_count',
  federationStatus = 'consensus_status',
  inviteCode = 'invite_code',
  config = 'config',
  module = 'module',
  audit = 'audit',
}

export enum LightningModuleRpc {
  listGateways = 'list_gateways',
}

type ModuleRpc = LightningModuleRpc;

export interface AdminApiInterface extends SharedApiInterface {
  version: () => Promise<Versions>;
  fetchEpochCount: () => Promise<number>;
  inviteCode: () => Promise<string>;
  config: (connection: string) => Promise<ConfigResponse>;
  audit: () => Promise<AuditSummary>;
  moduleApiCall: <T>(moduleId: number, rpc: ModuleRpc) => Promise<T>;
}

export class GuardianApi
  implements SocketAndAuthInterface, SetupApiInterface, AdminApiInterface
{
  private base = new BaseGuardianApi();

  /*** WebSocket methods ***/

  public connect = async (): Promise<JsonRpcWebsocket> => {
    return this.base.connect();
  };

  shutdown = async (): Promise<boolean> => {
    return this.base.shutdown();
  };

  getPassword = (): string | null => {
    return this.base.getPassword();
  };

  testPassword = async (password: string): Promise<boolean> => {
    return this.base.testPassword(password);
  };

  /*** Shared RPC methods */

  status = (): Promise<StatusResponse> => {
    return this.base.status();
  };

  /*** Setup RPC methods ***/

  setPassword = async (password: string): Promise<void> => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, password);

    return this.base.call(SetupRpc.setPassword);
  };

  private clearPassword = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  setConfigGenConnections = async (
    ourName: string,
    leaderUrl?: string
  ): Promise<void> => {
    const connections = {
      our_name: ourName,
      leader_api_url: leaderUrl,
    };

    return this.base.call(SetupRpc.setConfigGenConnections, connections);
  };

  getDefaultConfigGenParams = (): Promise<ConfigGenParams> => {
    return this.base.call(SetupRpc.getDefaultConfigGenParams);
  };

  getConsensusConfigGenParams = (): Promise<ConsensusState> => {
    return this.base.call(SetupRpc.getConsensusConfigGenParams);
  };

  setConfigGenParams = (params: ConfigGenParams): Promise<void> => {
    return this.base.call(SetupRpc.setConfigGenParams, params);
  };

  getVerifyConfigHash = (): Promise<PeerHashMap> => {
    return this.base.call(SetupRpc.getVerifyConfigHash);
  };

  runDkg = (): Promise<void> => {
    return this.base.call(SetupRpc.runDkg);
  };

  verifiedConfigs = (): Promise<void> => {
    return this.base.call(SetupRpc.verifiedConfigs);
  };

  startConsensus = async (): Promise<void> => {
    const sleep = (time: number) =>
      new Promise((resolve) => setTimeout(resolve, time));

    // Special case: start_consensus kills the server, which sometimes causes it not to respond.
    // If it doesn't respond within 5 seconds, continue on with status checks.
    await Promise.any([
      this.base.call<null>(SetupRpc.startConsensus),
      sleep(5000),
    ]);

    // Try to reconnect and confirm that status is ConsensusRunning. Retry multiple
    // times, but eventually give up and just throw.
    let tries = 0;
    const maxTries = 10;
    const attemptConfirmConsensusRunning = async (): Promise<void> => {
      try {
        await this.connect();
        await this.shutdown();
        const status = await this.status();
        if (status.server === ServerStatus.ConsensusRunning) {
          return;
        } else {
          throw new Error(
            `Expected status ConsensusRunning, got ${status.server}`
          );
        }
      } catch (err) {
        console.warn('Failed to confirm consensus running:', err);
      }
      // Retry after a delay if we haven't exceeded the max number of tries, otherwise give up.
      if (tries < maxTries) {
        tries++;
        await sleep(1000);
        return attemptConfirmConsensusRunning();
      } else {
        throw new Error('Failed to start consensus, see logs for more info.');
      }
    };

    return attemptConfirmConsensusRunning();
  };

  /*** Running RPC methods */

  version = (): Promise<Versions> => {
    return this.base.call(AdminRpc.version);
  };

  fetchEpochCount = (): Promise<number> => {
    return this.base.call(AdminRpc.fetchEpochCount);
  };

  federationStatus = (): Promise<FederationStatus> => {
    return this.base.call(AdminRpc.federationStatus);
  };

  inviteCode = (): Promise<string> => {
    return this.base.call(AdminRpc.inviteCode);
  };

  config = (connection: string): Promise<ConfigResponse> => {
    return this.base.call<ConfigResponse>(AdminRpc.config, connection);
  };

  audit = (): Promise<AuditSummary> => {
    return this.base.call<AuditSummary>(AdminRpc.audit);
  };

  moduleApiCall = <T>(moduleId: number, rpc: ModuleRpc): Promise<T> => {
    const method = `${AdminRpc.module}_${moduleId}_${rpc}`;
    return this.base.call_any_method<T>(method);
  };
}
