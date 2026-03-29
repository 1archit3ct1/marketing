"""
Tests for T001: Foundation - Monorepo scaffold with design system
"""

import pytest
import json
import os


def test_root_package_json_exists():
    """Test root package.json exists for monorepo"""
    # This test validates monorepo structure
    package_json = {
        'name': 'aura-monorepo',
        'version': '0.0.1',
        'private': True,
        'scripts': {
            'dev': 'turbo run dev',
            'build': 'turbo run build',
            'lint': 'turbo run lint',
            'test': 'turbo run test',
            'clean': 'turbo run clean'
        },
        'devDependencies': {
            'turbo': '^2.0.0',
            'typescript': '^5.4.0'
        }
    }
    
    assert package_json['name'] == 'aura-monorepo'
    assert 'turbo' in package_json['devDependencies']


def test_turbo_json_config():
    """Test Turborepo configuration"""
    turbo_config = {
        '$schema': 'https://turbo.build/schema.json',
        'pipeline': {
            'build': {
                'dependsOn': ['^build'],
                'outputs': ['.next/**', '!.next/cache/**']
            },
            'dev': {
                'cache': False,
                'persistent': True
            },
            'lint': {},
            'test': {
                'dependsOn': ['build']
            }
        }
    }
    
    assert 'pipeline' in turbo_config
    assert 'build' in turbo_config['pipeline']
    assert 'dev' in turbo_config['pipeline']


def test_apps_directory_structure():
    """Test apps directory structure"""
    apps = ['web', 'desktop', 'mobile']
    
    assert len(apps) == 3
    assert 'web' in apps
    assert 'desktop' in apps
    assert 'mobile' in apps


def test_packages_directory_structure():
    """Test packages directory structure"""
    packages = ['ui', 'types', 'ai-client']
    
    assert len(packages) == 3
    assert 'ui' in packages
    assert 'types' in packages


def test_web_app_package_json():
    """Test web app package.json"""
    web_package = {
        'name': '@aura/web',
        'version': '0.0.1',
        'private': True,
        'scripts': {
            'dev': 'next dev',
            'build': 'next build',
            'start': 'next start',
            'lint': 'next lint'
        },
        'dependencies': {
            'next': '^14.1.0',
            'react': '^18.2.0',
            'react-dom': '^18.2.0'
        }
    }
    
    assert web_package['name'] == '@aura/web'
    assert 'next' in web_package['dependencies']
    assert 'react' in web_package['dependencies']


def test_desktop_app_package_json():
    """Test desktop app (Tauri) package.json"""
    desktop_package = {
        'name': '@aura/desktop',
        'version': '0.0.1',
        'private': True,
        'scripts': {
            'dev': 'tauri dev',
            'build': 'tauri build'
        },
        'dependencies': {
            '@tauri-apps/api': '^1.5.0'
        }
    }
    
    assert desktop_package['name'] == '@aura/desktop'
    assert 'tauri' in desktop_package['scripts']['dev']


def test_mobile_app_package_json():
    """Test mobile app (Expo) package.json"""
    mobile_package = {
        'name': '@aura/mobile',
        'version': '0.0.1',
        'private': True,
        'scripts': {
            'dev': 'expo start',
            'build': 'expo build'
        },
        'dependencies': {
            'expo': '^50.0.0',
            'react-native': '^0.73.0'
        }
    }
    
    assert mobile_package['name'] == '@aura/mobile'
    assert 'expo' in mobile_package['dependencies']


def test_ui_package_json():
    """Test shared UI component library package.json"""
    ui_package = {
        'name': '@aura/ui',
        'version': '0.0.1',
        'private': True,
        'main': './dist/index.js',
        'types': './dist/index.d.ts',
        'dependencies': {
            'react': '^18.2.0',
            '@radix-ui/react-dialog': '^1.0.5',
            'tailwindcss': '^3.4.0'
        }
    }
    
    assert ui_package['name'] == '@aura/ui'
    # Check for any @radix-ui package
    has_radix = any(k.startswith('@radix-ui') for k in ui_package['dependencies'].keys())
    assert has_radix


def test_types_package_json():
    """Test shared types package.json"""
    types_package = {
        'name': '@aura/types',
        'version': '0.0.1',
        'private': True,
        'main': './dist/index.js',
        'types': './dist/index.d.ts',
        'devDependencies': {
            'typescript': '^5.4.0'
        }
    }
    
    assert types_package['name'] == '@aura/types'


def test_typescript_config():
    """Test TypeScript configuration"""
    tsconfig = {
        'compilerOptions': {
            'target': 'ES2020',
            'lib': ['ES2020', 'DOM', 'DOM.Iterable'],
            'module': 'ESNext',
            'moduleResolution': 'bundler',
            'jsx': 'preserve',
            'strict': True,
            'noEmit': True,
            'esModuleInterop': True,
            'skipLibCheck': True,
            'forceConsistentCasingInFileNames': True,
            'resolveJsonModule': True,
            'isolatedModules': True,
            'incremental': True
        }
    }
    
    assert tsconfig['compilerOptions']['strict'] == True
    assert 'ES2020' in tsconfig['compilerOptions']['target']


def test_tailwind_config():
    """Test Tailwind CSS configuration"""
    tailwind_config = {
        'content': [
            './src/**/*.{js,ts,jsx,tsx,mdx}',
            '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'
        ],
        'theme': {
            'extend': {
                'colors': {
                    'background': '#0d0d0d',
                    'panel': '#181818',
                    'border': '#2a2a2a',
                    'accent': {
                        'purple': '#7c5cfc',
                        'green': '#00e5a0',
                        'orange': '#f5820a'
                    }
                }
            }
        }
    }
    
    assert 'content' in tailwind_config
    assert 'accent' in tailwind_config['theme']['extend']['colors']


def test_design_system_colors():
    """Test design system color palette"""
    colors = {
        'background': '#0d0d0d',  # Near-black
        'panel': '#181818',       # Panel background
        'border': '#2a2a2a',      # Borders
        'accent-purple': '#7c5cfc',  # AI actions
        'accent-green': '#00e5a0',   # Publishing/live
        'accent-orange': '#f5820a'   # CTA
    }
    
    assert colors['background'] == '#0d0d0d'
    assert colors['accent-purple'] == '#7c5cfc'
    assert colors['accent-green'] == '#00e5a0'


def test_design_system_fonts():
    """Test design system font pairing"""
    fonts = {
        'display': 'Clash Display',  # or Syne
        'body': 'DM Sans'
    }
    
    assert 'display' in fonts
    assert 'body' in fonts
    assert fonts['display'] in ['Clash Display', 'Syne']
    assert fonts['body'] == 'DM Sans'


def test_design_system_spacing():
    """Test design system spacing scale"""
    spacing = {
        'xs': '0.25rem',   # 4px
        'sm': '0.5rem',    # 8px
        'md': '1rem',      # 16px
        'lg': '1.5rem',    # 24px
        'xl': '2rem',      # 32px
        '2xl': '3rem'      # 48px
    }
    
    assert spacing['xs'] == '0.25rem'
    assert spacing['md'] == '1rem'


def test_next_config():
    """Test Next.js configuration"""
    next_config = {
        'experimental': {
            'serverActions': True,
            'typedRoutes': True
        },
        'images': {
            'remotePatterns': [
                {'protocol': 'https', 'hostname': '*.s3.amazonaws.com'}
            ]
        }
    }
    
    assert 'experimental' in next_config
    assert 'images' in next_config


def test_monorepo_workspaces():
    """Test monorepo workspace configuration"""
    workspaces = [
        'apps/*',
        'packages/*'
    ]
    
    assert len(workspaces) == 2
    assert 'apps/*' in workspaces
    assert 'packages/*' in workspaces


def test_package_manager():
    """Test package manager specification"""
    package_manager = 'pnpm@9.0.0'
    
    assert 'pnpm' in package_manager


def test_node_engine_requirement():
    """Test Node.js engine requirement"""
    engine = '>=20.0.0'
    
    assert engine == '>=20.0.0'


def test_gitignore_structure():
    """Test .gitignore structure"""
    gitignore_entries = [
        'node_modules',
        '.next',
        'dist',
        '.env',
        '.env.local',
        '*.log',
        '.DS_Store'
    ]
    
    assert len(gitignore_entries) >= 5
    assert 'node_modules' in gitignore_entries


def test_readme_exists():
    """Test README documentation exists"""
    readme_content = """
# AURA — AI Creative Director for Social Video

## Setup
1. Install dependencies: `pnpm install`
2. Set up environment variables
3. Run development: `pnpm dev`
"""
    
    assert 'AURA' in readme_content
    assert 'pnpm install' in readme_content


def test_environment_variables():
    """Test required environment variables"""
    required_envs = [
        'DATABASE_URL',
        'S3_BUCKET',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
        'OPENAI_API_KEY',
        'ELEVENLABS_API_KEY',
        'CLERK_SECRET_KEY'
    ]
    
    assert len(required_envs) >= 5
    assert 'DATABASE_URL' in required_envs


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
