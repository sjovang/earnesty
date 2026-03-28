var builder = DistributedApplication.CreateBuilder(args);

builder.AddNpmApp("frontend", "../frontend", "dev")
    .WithHttpEndpoint(env: "VITE_PORT")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

builder.Build().Run();
