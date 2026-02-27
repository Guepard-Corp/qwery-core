export type CodeDescription = {
  code: number;
  message: string;
};

export class Code {
  // Common

  public static SUCCESS: CodeDescription = {
    code: 200,
    message: 'Success.',
  };

  public static BAD_REQUEST_ERROR: CodeDescription = {
    code: 400,
    message: 'Bad request.',
  };

  public static UNAUTHORIZED_ERROR: CodeDescription = {
    code: 401,
    message: 'Unauthorized error.',
  };

  public static WRONG_CREDENTIALS_ERROR: CodeDescription = {
    code: 402,
    message: 'Wrong Credentials.',
  };

  public static ACCESS_DENIED_ERROR: CodeDescription = {
    code: 403,
    message: 'Access denied.',
  };

  public static INTERNAL_ERROR: CodeDescription = {
    code: 500,
    message: 'Internal error.',
  };

  public static BAD_GATEWAY_ERROR: CodeDescription = {
    code: 502,
    message: 'Bad gateway.',
  };

  public static SERVICE_UNAVAILABLE_ERROR: CodeDescription = {
    code: 503,
    message: 'Service unavailable.',
  };

  public static ENTITY_NOT_FOUND_ERROR: CodeDescription = {
    code: 1000,
    message: 'Entity not found.',
  };

  public static ENTITY_VALIDATION_ERROR: CodeDescription = {
    code: 1001,
    message: 'Entity validation error.',
  };

  public static USE_CASE_PORT_VALIDATION_ERROR: CodeDescription = {
    code: 1002,
    message: 'Use-case port validation error.',
  };

  public static VALUE_OBJECT_VALIDATION_ERROR: CodeDescription = {
    code: 1003,
    message: 'Value object validation error.',
  };

  public static ENTITY_ALREADY_EXISTS_ERROR: CodeDescription = {
    code: 1004,
    message: 'Entity already exists.',
  };

  // Notebook - 2000-2099

  public static NOTEBOOK_NOT_FOUND_ERROR: CodeDescription = {
    code: 2000,
    message: 'Notebook not found.',
  };

  public static NOTEBOOK_ALREADY_EXISTS_ERROR: CodeDescription = {
    code: 2001,
    message: 'Notebook already exists.',
  };

  public static NOTEBOOK_UPDATE_ERROR: CodeDescription = {
    code: 2002,
    message: 'Notebook update error.',
  };

  public static NOTEBOOK_DELETE_ERROR: CodeDescription = {
    code: 2003,
    message: 'Notebook delete error.',
  };

  public static NOTEBOOK_GET_ERROR: CodeDescription = {
    code: 2004,
    message: 'Notebook get error.',
  };

  public static NOTEBOOK_GET_ALL_ERROR: CodeDescription = {
    code: 2005,
    message: 'Notebook get all error.',
  };

  public static NOTEBOOK_CREATE_ERROR: CodeDescription = {
    code: 2006,
    message: 'Notebook create error.',
  };

  // User - 2100-2199

  public static USER_NOT_FOUND_ERROR: CodeDescription = {
    code: 2100,
    message: 'User not found.',
  };

  public static USER_ALREADY_EXISTS_ERROR: CodeDescription = {
    code: 2101,
    message: 'User already exists.',
  };

  public static USER_UPDATE_ERROR: CodeDescription = {
    code: 2102,
    message: 'User update error.',
  };

  public static USER_DELETE_ERROR: CodeDescription = {
    code: 2103,
    message: 'User delete error.',
  };

  public static USER_GET_ERROR: CodeDescription = {
    code: 2104,
    message: 'User get error.',
  };

  public static USER_GET_ALL_ERROR: CodeDescription = {
    code: 2105,
    message: 'User get all error.',
  };

  public static USER_CREATE_ERROR: CodeDescription = {
    code: 2106,
    message: 'User create error.',
  };

  // Workspace - 2200-2299

  public static WORKSPACE_NOT_FOUND_ERROR: CodeDescription = {
    code: 2200,
    message: 'Workspace not found.',
  };

  public static WORKSPACE_UPDATE_ERROR: CodeDescription = {
    code: 2201,
    message: 'Workspace update error.',
  };

  public static WORKSPACE_GET_ERROR: CodeDescription = {
    code: 2203,
    message: 'Workspace get error.',
  };

  public static WORKSPACE_CREATE_ERROR: CodeDescription = {
    code: 2205,
    message: 'Workspace create error.',
  };
  // Organization - 2300-2399

  public static ORGANIZATION_NOT_FOUND_ERROR: CodeDescription = {
    code: 2300,
    message: 'Organization not found.',
  };

  public static ORGANIZATION_UPDATE_ERROR: CodeDescription = {
    code: 2301,
    message: 'Organization update error.',
  };

  public static ORGANIZATION_DELETE_ERROR: CodeDescription = {
    code: 2302,
    message: 'Organization delete error.',
  };

  public static ORGANIZATION_GET_ERROR: CodeDescription = {
    code: 2303,
    message: 'Organization get error.',
  };

  public static ORGANIZATION_GET_ALL_ERROR: CodeDescription = {
    code: 2304,
    message: 'Organization get all error.',
  };

  public static ORGANIZATION_CREATE_ERROR: CodeDescription = {
    code: 2305,
    message: 'Organization create error.',
  };

  // Project - 2400-2499

  public static PROJECT_NOT_FOUND_ERROR: CodeDescription = {
    code: 2400,
    message: 'Project not found.',
  };

  public static PROJECT_UPDATE_ERROR: CodeDescription = {
    code: 2401,
    message: 'Project update error.',
  };

  public static PROJECT_DELETE_ERROR: CodeDescription = {
    code: 2402,
    message: 'Project delete error.',
  };

  public static PROJECT_GET_ERROR: CodeDescription = {
    code: 2403,
    message: 'Project get error.',
  };

  public static PROJECT_GET_ALL_ERROR: CodeDescription = {
    code: 2404,
    message: 'Project get all error.',
  };

  public static PROJECT_CREATE_ERROR: CodeDescription = {
    code: 2405,
    message: 'Project create error.',
  };

  // Datasource - 2500-2599

  public static DATASOURCE_NOT_FOUND_ERROR: CodeDescription = {
    code: 2500,
    message: 'Datasource not found.',
  };

  public static DATASOURCE_ALREADY_EXISTS_ERROR: CodeDescription = {
    code: 2501,
    message: 'Datasource already exists.',
  };

  public static DATASOURCE_UPDATE_ERROR: CodeDescription = {
    code: 2502,
    message: 'Datasource update error.',
  };

  public static DATASOURCE_DELETE_ERROR: CodeDescription = {
    code: 2503,
    message: 'Datasource delete error.',
  };

  public static DATASOURCE_GET_ERROR: CodeDescription = {
    code: 2504,
    message: 'Datasource get error.',
  };

  public static DATASOURCE_GET_ALL_ERROR: CodeDescription = {
    code: 2505,
    message: 'Datasource get all error.',
  };

  public static DATASOURCE_CREATE_ERROR: CodeDescription = {
    code: 2506,
    message: 'Datasource create error.',
  };

  // Agent - 2600-2699

  public static AGENT_SESSION_NOT_FOUND_ERROR: CodeDescription = {
    code: 2600,
    message: 'Agent session not found.',
  };

  public static STATE_MACHINE_NOT_FOUND_ERROR: CodeDescription = {
    code: 2601,
    message: 'State machine not found.',
  };

  public static INVALID_STATE_TRANSITION_ERROR: CodeDescription = {
    code: 2602,
    message: 'Invalid state transition.',
  };

  // Conversation - 2700-2799

  public static CONVERSATION_NOT_FOUND_ERROR: CodeDescription = {
    code: 2700,
    message: 'Conversation not found.',
  };

  public static CONVERSATION_ALREADY_EXISTS_ERROR: CodeDescription = {
    code: 2701,
    message: 'Conversation already exists.',
  };

  public static CONVERSATION_UPDATE_ERROR: CodeDescription = {
    code: 2702,
    message: 'Conversation update error.',
  };

  public static CONVERSATION_DELETE_ERROR: CodeDescription = {
    code: 2703,
    message: 'Conversation delete error.',
  };

  public static CONVERSATION_GET_ERROR: CodeDescription = {
    code: 2704,
    message: 'Conversation get error.',
  };

  public static CONVERSATION_CREATE_ERROR: CodeDescription = {
    code: 2705,
    message: 'Conversation create error.',
  };

  // Message - 2800-2899

  public static MESSAGE_NOT_FOUND_ERROR: CodeDescription = {
    code: 2800,
    message: 'Message not found.',
  };

  public static MESSAGE_ALREADY_EXISTS_ERROR: CodeDescription = {
    code: 2801,
    message: 'Message already exists.',
  };

  public static MESSAGE_UPDATE_ERROR: CodeDescription = {
    code: 2802,
    message: 'Message update error.',
  };

  public static MESSAGE_DELETE_ERROR: CodeDescription = {
    code: 2803,
    message: 'Message delete error.',
  };

  public static MESSAGE_GET_ERROR: CodeDescription = {
    code: 2804,
    message: 'Message get error.',
  };

  public static MESSAGE_CREATE_ERROR: CodeDescription = {
    code: 2805,
    message: 'Message create error.',
  };
}
