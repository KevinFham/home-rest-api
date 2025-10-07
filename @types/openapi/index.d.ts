// Courtesy of blipk https://github.com/wesleytodd/express-openapi/issues/25#issuecomment-2309444521

declare module "@wesleytodd/openapi" {
    import type { Request, Response, NextFunction } from "express"
    import type { OpenAPIV3 } from "openapi-types"

    type Middleware = ( req: Request, res: Response, next: NextFunction ) => void;

    interface OpenApiOptions {
      openapi?: string;
      info?: {title: string, description: string, version: string};
    }

    interface OpenApiMiddleware extends Middleware {
      routePrefix: string;
      document: OpenAPIV3.Document;
      generateDocument: ( options: {
        paths?: string | string[];
        doc?: Partial<OpenAPIV3.Document>;
        basePath?: string;
      } ) => OpenAPIV3.Document;
      options: OpenApiOptions;
      path: ( schema?: OpenAPIV3.SchemaObject ) => Middleware;
      validPath: ( schema?: OpenAPIV3.SchemaObject, pathOpts?: object ) => Middleware;
      component: ( type: ComponentType, name?: string, description?: object ) => ComponentReturnType;
      schema: ( name: string, description: OpenAPIV3.SchemaObject ) => OpenAPIV3.SchemaObject;
      response: ( name: string, description: OpenAPIV3.ResponseObject ) => OpenAPIV3.ResponseObject;
      parameters: ( name: string, description: OpenAPIV3.ParameterObject ) => OpenAPIV3.ParameterObject;
      examples: ( name: string, description: OpenAPIV3.ExampleObject ) => OpenAPIV3.ExampleObject;
      requestBodies: ( name: string, description: OpenAPIV3.RequestBodyObject ) => OpenAPIV3.RequestBodyObject;
      headers: ( name: string, description: OpenAPIV3.HeaderObject ) => OpenAPIV3.HeaderObject;
      securitySchemes: ( name: string, description: OpenAPIV3.SecuritySchemeObject ) => OpenAPIV3.SecuritySchemeObject;
      links: ( name: string, description: OpenAPIV3.LinkObject ) => OpenAPIV3.LinkObject;
      callbacks: ( name: string, description: OpenAPIV3.CallbackObject ) => OpenAPIV3.CallbackObject;
      swaggerui: ( options?: OpenApiOptions ) => Middleware[];
    }

    type ComponentType =
      | "schemas"
      | "responses"
      | "parameters"
      | "examples"
      | "requestBodies"
      | "headers"
      | "securitySchemes"
      | "links"
      | "callbacks";

    type ComponentReturnType =
      | OpenAPIV3.ReferenceObject
      | OpenAPIV3.SchemaObject
      | OpenAPIV3.ResponseObject
      | OpenAPIV3.ParameterObject
      | OpenAPIV3.ExampleObject
      | OpenAPIV3.RequestBodyObject
      | OpenAPIV3.HeaderObject
      | OpenAPIV3.SecuritySchemeObject
      | OpenAPIV3.LinkObject
      | OpenAPIV3.CallbackObject;

    function ExpressOpenApi( routePrefix?: string, doc?: OpenAPIV3.Document, opts?: OpenApiOptions ): OpenApiMiddleware;
    function ExpressOpenApi( doc?: OpenAPIV3.Document, opts?: OpenApiOptions ): OpenApiMiddleware;
    function ExpressOpenApi( opts?: OpenApiOptions ): OpenApiMiddleware;


    namespace ExpressOpenApi {
      const minimumViableDocument: OpenAPIV3.Document
      const defaultRoutePrefix: string
    }

    export = ExpressOpenApi;
}
