{
  description = "Personal browser extensions";

  inputs = {
    nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.1"; # unstable Nixpkgs
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      perSystem =
        { pkgs, lib, ... }:
        let
          # Every top-level directory with a manifest.json is an extension.
          extensionNames = lib.attrNames (
            lib.filterAttrs (
              name: type: type == "directory" && builtins.pathExists (./. + "/${name}/manifest.json")
            ) (builtins.readDir ./.)
          );

          mkExtension =
            name:
            let
              root = ./. + "/${name}";
              manifest = lib.importJSON (root + "/manifest.json");
              src = lib.fileset.toSource {
                inherit root;
                fileset = lib.fileset.difference root (lib.fileset.maybeMissing (root + "/README.md"));
              };
            in
            pkgs.runCommandLocal "${name}-${manifest.version}" { } "cp -r ${src} $out";

          extensions = lib.genAttrs extensionNames mkExtension;

          hx-run = pkgs.writeShellScriptBin "hx-run" ''
            if [ $# -eq 0 ]; then
              echo "usage: hx-run <extension-dir>..." >&2
              exit 1
            fi
            dirs=$(realpath "$@" | paste -sd,)
            exec helium \
              --user-data-dir="''${XDG_CACHE_HOME:-$HOME/.cache}/helium-dev" \
              --no-first-run \
              --load-extension="$dirs"
          '';
        in
        {
          packages = extensions // {
            default = pkgs.linkFarm "hextensions" (
              lib.mapAttrsToList (name: path: { inherit name path; }) extensions
            );
          };

          devShells.default = pkgs.mkShellNoCC {
            packages = [
              pkgs.deno
              hx-run
            ];
          };

          formatter = pkgs.nixfmt-rfc-style;
        };
    };
}
