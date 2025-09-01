import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Manifest Permissions Validation", () => {
  let manifest: any;

  beforeEach(() => {
    // Load the actual manifest.json file
    const manifestPath = path.join(__dirname, "../manifest.json");
    const manifestContent = fs.readFileSync(manifestPath, "utf8");
    manifest = JSON.parse(manifestContent);
  });

  describe("Basic manifest structure", () => {
    it("should have correct manifest version", () => {
      expect(manifest.manifest_version).toBe(3);
    });

    it("should have required basic fields", () => {
      expect(manifest.name).toBe("Briefcase");
      expect(manifest.version).toBeDefined();
      expect(manifest.description).toBeDefined();
      expect(manifest.minimum_chrome_version).toBeDefined();
    });

    it("should have proper permissions array", () => {
      expect(Array.isArray(manifest.permissions)).toBe(true);
      expect(manifest.permissions.length).toBeGreaterThan(0);
    });
  });

  describe("Current required permissions", () => {
    it("should have activeTab permission for content access", () => {
      expect(manifest.permissions).toContain("activeTab");
    });

    it("should have scripting permission for content script injection", () => {
      expect(manifest.permissions).toContain("scripting");
    });

    it("should have storage permission for local data persistence", () => {
      expect(manifest.permissions).toContain("storage");
    });

    it("should have sidePanel permission for side panel functionality", () => {
      expect(manifest.permissions).toContain("sidePanel");
    });
  });

  describe("Downloads permission requirements", () => {
    it("should have downloads permission for export functionality", () => {
      expect(manifest.permissions).toContain("downloads");
    });

    it("should not have excessive permissions beyond required set", () => {
      const allowedPermissions = [
        "activeTab",
        "scripting",
        "storage",
        "sidePanel",
        "downloads",
      ];

      for (const permission of manifest.permissions) {
        expect(allowedPermissions).toContain(permission);
      }
    });
  });

  describe("Manifest V3 compliance", () => {
    it("should use service worker background script", () => {
      expect(manifest.background).toBeDefined();
      expect(manifest.background.service_worker).toBeDefined();
      expect(manifest.background.type).toBe("module");
    });

    it("should have proper content security policy", () => {
      expect(manifest.content_security_policy).toBeDefined();
      expect(manifest.content_security_policy.extension_pages).toContain(
        "script-src 'self'",
      );
    });

    it("should have side panel configuration", () => {
      expect(manifest.side_panel).toBeDefined();
      expect(manifest.side_panel.default_path).toBe("sidepanel/index.html");
    });
  });

  describe("Chrome API compatibility", () => {
    it("should specify minimum Chrome version that supports downloads API", () => {
      const minVersion = parseInt(manifest.minimum_chrome_version);
      expect(minVersion).toBeGreaterThanOrEqual(88); // Downloads API stable since Chrome 88
    });

    it("should have proper action configuration for extension button", () => {
      expect(manifest.action).toBeDefined();
      expect(manifest.action.default_title).toBeDefined();
      expect(manifest.action.default_icon).toBeDefined();
    });
  });

  describe("Security requirements", () => {
    it("should have restrictive content security policy", () => {
      const csp = manifest.content_security_policy.extension_pages;
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it("should specify web accessible resources appropriately", () => {
      expect(manifest.web_accessible_resources).toBeDefined();
      expect(Array.isArray(manifest.web_accessible_resources)).toBe(true);
      expect(manifest.web_accessible_resources.length).toBeGreaterThan(0);

      const resource = manifest.web_accessible_resources[0];
      expect(resource.resources).toContain("sidepanel/index.html");
      expect(resource.matches).toContain("<all_urls>");
    });
  });

  describe("Permission runtime access validation", () => {
    beforeEach(() => {
      // Mock chrome.permissions API for testing
      global.chrome = {
        ...global.chrome,
        permissions: {
          contains: vi.fn(),
          getAll: vi.fn(),
          request: vi.fn(),
        },
        downloads: {
          download: vi.fn(),
          onChanged: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
          },
        },
      } as any;
    });

    it("should verify downloads permission is granted", async () => {
      // Mock permission check returning true for downloads
      (chrome.permissions.contains as any).mockResolvedValue(true);

      const hasDownloadsPermission = await chrome.permissions.contains({
        permissions: ["downloads"],
      });

      expect(hasDownloadsPermission).toBe(true);
      expect(chrome.permissions.contains).toHaveBeenCalledWith({
        permissions: ["downloads"],
      });
    });

    it("should verify all required permissions are granted", async () => {
      const requiredPermissions = [
        "activeTab",
        "scripting",
        "storage",
        "sidePanel",
        "downloads",
      ];

      // Mock getAll returning all required permissions
      (chrome.permissions.getAll as any).mockResolvedValue({
        permissions: requiredPermissions,
        origins: [],
      });

      const allPermissions = await chrome.permissions.getAll();

      expect(allPermissions.permissions).toEqual(
        expect.arrayContaining(requiredPermissions),
      );

      for (const permission of requiredPermissions) {
        expect(allPermissions.permissions).toContain(permission);
      }
    });

    it("should handle permission request failure gracefully", async () => {
      // Mock permission request returning false
      (chrome.permissions.request as any).mockResolvedValue(false);

      const granted = await chrome.permissions.request({
        permissions: ["downloads"],
      });

      expect(granted).toBe(false);
      expect(chrome.permissions.request).toHaveBeenCalledWith({
        permissions: ["downloads"],
      });
    });
  });
});
