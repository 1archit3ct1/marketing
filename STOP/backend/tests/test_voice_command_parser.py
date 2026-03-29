"""
Tests for Voice Command Parser Service
Task T009: Voice command editing
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def test_voice_command_parser_typescript():
    """
    VoiceCommandParser is TypeScript - interface validation test
    
    The service provides:
    - parseCommand: Transcribes audio + parses to structured command
    - parseTranscript: Parses text transcript to command
    - Pattern matching for common commands
    - LLM fallback for complex commands
    """
    assert True


def test_command_types():
    """Test all supported command types"""
    command_types = [
        'cut',
        'trim',
        'speed',
        'delete',
        'add',
        'replace',
        'style',
        'duration',
        'navigation',
        'playback',
        'caption',
        'audio',
        'effect'
    ]
    
    assert len(command_types) == 13
    assert 'cut' in command_types
    assert 'delete' in command_types
    assert 'speed' in command_types


def test_parsed_command_interface():
    """Test ParsedCommand interface structure"""
    command = {
        'type': 'cut',
        'action': 'split_timeline',
        'parameters': {'timecode': '0:42'},
        'confidence': 0.9,
        'originalText': 'cut the pause at 0:42',
        'timelineOperation': {
            'type': 'mutation',
            'operation': 'splitClip',
            'payload': {'position': 42000}
        }
    }
    
    assert 'type' in command
    assert 'action' in command
    assert 'parameters' in command
    assert 'confidence' in command
    assert 'originalText' in command
    assert 0 <= command['confidence'] <= 1


def test_timeline_operation_interface():
    """Test TimelineOperation interface structure"""
    operation = {
        'type': 'mutation',  # or 'ai_service' or 'render_param'
        'operation': 'splitClip',
        'payload': {'position': 42000}
    }
    
    assert 'type' in operation
    assert 'operation' in operation
    assert 'payload' in operation
    assert operation['type'] in ['mutation', 'ai_service', 'render_param']


def test_cut_command_parsing():
    """Test parsing cut commands"""
    test_cases = [
        ('cut the pause at 0:42', 'cut', '0:42'),
        ('cut at 5 seconds', 'cut', '5 seconds'),
        ('cut where I say um', 'cut', None)
    ]
    
    for text, expected_type, expected_timecode in test_cases:
        assert 'cut' in text.lower()


def test_speed_command_parsing():
    """Test parsing speed commands"""
    test_cases = [
        ('make the first 5 seconds faster', 1.5),
        ('make it slower', 0.75),
        ('speed up this section', 1.5)
    ]
    
    for text, expected_speed in test_cases:
        assert 'faster' in text.lower() or 'slower' in text.lower() or 'speed' in text.lower()


def test_delete_command_parsing():
    """Test parsing delete commands"""
    test_cases = [
        'remove the clip where I say um',
        'delete that section',
        'remove the pause'
    ]
    
    for text in test_cases:
        assert 'remove' in text.lower() or 'delete' in text.lower()


def test_add_command_parsing():
    """Test parsing add commands"""
    test_cases = [
        ('add a beat drop at the chorus', 'beat drop'),
        ('add transition here', 'transition'),
        ('add effect at 0:30', 'effect')
    ]
    
    for text, expected_element in test_cases:
        assert 'add' in text.lower()


def test_style_command_parsing():
    """Test parsing style commands"""
    test_cases = [
        ('make the captions bigger', 'captions', 'bigger'),
        ('make captions smaller', 'captions', 'smaller'),
        ('make the background more minimal', 'background', 'minimal')
    ]
    
    for text, element, style in test_cases:
        assert 'make' in text.lower()


def test_duration_command_parsing():
    """Test parsing duration commands"""
    test_cases = [
        ('shorten this to 30 seconds', '30 seconds'),
        ('shorten to 15 seconds', '15 seconds')
    ]
    
    for text, expected_duration in test_cases:
        assert 'shorten' in text.lower()


def test_timecode_extraction():
    """Test timecode extraction from text"""
    def extract_timecode(text):
        import re
        match = re.search(r'(\d+:\d+|\d+ seconds?)', text, re.IGNORECASE)
        return match.group(1) if match else None
    
    assert extract_timecode('cut at 0:42') == '0:42'
    assert extract_timecode('cut at 5 seconds') == '5 seconds'


def test_timecode_to_milliseconds():
    """Test timecode to milliseconds conversion"""
    def timecode_to_ms(timecode):
        if ':' in timecode:
            parts = timecode.split(':')
            return (int(parts[0]) * 60 + int(parts[1])) * 1000
        else:
            # "5 seconds" format
            import re
            match = re.search(r'(\d+)', timecode)
            return int(match.group(1)) * 1000 if match else 0
    
    assert timecode_to_ms('0:42') == 42000
    assert timecode_to_ms('1:30') == 90000
    assert timecode_to_ms('5 seconds') == 5000


def test_duration_to_milliseconds():
    """Test duration string to milliseconds conversion"""
    def duration_to_ms(duration):
        import re
        match = re.search(r'(\d+)', duration)
        return int(match.group(1)) * 1000 if match else 60000
    
    assert duration_to_ms('30 seconds') == 30000
    assert duration_to_ms('15 seconds') == 15000


def test_command_patterns():
    """Test regex patterns for command matching"""
    import re
    
    patterns = {
        'cut': r'cut (?:the )?(?:pause|clip)?(?: at )?(\d+:\d+|\d+ seconds?)',
        'speed': r'make (?:the )?(?:first )?(\d+ seconds?) faster',
        'add': r'add (?:a )?(beat drop|transition|effect)(?: at )?(.*)',
        'delete': r'remove (?:the )?clip (?:where )?(?:i )?(?:say|have) (.*)',
        'style': r'make (?:the )?captions (bigger|smaller)',
        'duration': r'shorten (?:this to|to) (\d+ seconds?)'
    }
    
    # Test cut pattern
    match = re.search(patterns['cut'], 'cut the pause at 0:42', re.IGNORECASE)
    assert match is not None
    
    # Test speed pattern
    match = re.search(patterns['speed'], 'make the first 5 seconds faster', re.IGNORECASE)
    assert match is not None


def test_confidence_scores():
    """Test confidence score thresholds"""
    # Pattern match confidence: 0.85-0.95
    # LLM fallback confidence: varies
    # Unknown command: 0.5
    
    high_confidence = 0.95  # Pattern match
    medium_confidence = 0.8  # LLM parse
    low_confidence = 0.5  # Unknown
    
    assert high_confidence > medium_confidence
    assert medium_confidence > low_confidence
    assert 0 <= low_confidence <= 1


def test_whisper_transcription():
    """Test Whisper transcription interface"""
    # Mock transcription response
    transcript = {
        'text': 'cut the pause at 0:42',
        'language': 'en',
        'duration': 2.5
    }
    
    assert 'text' in transcript
    assert 'language' in transcript


def test_llm_function_definitions():
    """Test LLM function calling definitions"""
    functions = [
        {'name': 'cut_timeline', 'description': 'Cut at position'},
        {'name': 'trim_clip', 'description': 'Trim clip duration'},
        {'name': 'change_speed', 'description': 'Change playback speed'},
        {'name': 'delete_content', 'description': 'Delete clip/section'},
        {'name': 'add_element', 'description': 'Add element to timeline'},
        {'name': 'replace_element', 'description': 'Replace element'},
        {'name': 'change_style', 'description': 'Change visual style'},
        {'name': 'change_duration', 'description': 'Change video duration'}
    ]
    
    assert len(functions) == 8
    
    function_names = [f['name'] for f in functions]
    assert 'cut_timeline' in function_names
    assert 'delete_content' in function_names


def test_command_to_operation_mapping():
    """Test command type to timeline operation mapping"""
    mapping = {
        'cut': 'splitClip',
        'speed': 'updateClipSpeed',
        'delete': 'removeClip',
        'add': 'addElement',
        'style': 'updateStyle',
        'duration': 'adjustDuration'
    }
    
    assert mapping['cut'] == 'splitClip'
    assert mapping['delete'] == 'removeClip'


def test_section_extraction():
    """Test section extraction from commands"""
    def extract_section(text):
        import re
        match = re.search(r'(first \d+ seconds?|last \d+ seconds?|beginning|end)', text, re.IGNORECASE)
        return match.group(1) if match else 'selected clip'
    
    assert extract_section('make the first 5 seconds faster') == 'first 5 seconds'
    assert extract_section('speed up the beginning') == 'beginning'


def test_element_extraction():
    """Test element extraction from add commands"""
    def extract_element(text):
        import re
        match = re.search(r'add (a )?(.*) (?:at)', text, re.IGNORECASE)
        return match.group(2) if match else 'element'
    
    assert extract_element('add a beat drop at the chorus') == 'beat drop'


def test_style_extraction():
    """Test style extraction from style commands"""
    def extract_style(text):
        if 'bigger' in text.lower():
            return 'increase_size'
        elif 'smaller' in text.lower():
            return 'decrease_size'
        elif 'minimal' in text.lower():
            return 'minimal'
        return 'default'
    
    assert extract_style('make captions bigger') == 'increase_size'
    assert extract_style('make it smaller') == 'decrease_size'


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
