/** This is a stub class compiled with a target of Java 1.5 to fix a bug when
 * running pack200 in Java 1.6. Unless there is at least one class that is 
 * compiled with a target of 1.5 the packed jar will appear to be corrupt
 * when unpacked using Java 1.5 with the following error:
 * 
 *   Corrupted pack file: magic/ver = CAFED00D/160.1 should be CAFED00D/150.7
 * 
 * See this bug report from June 2008 that has not been fixed:
 * 
 *   Corrupted pack file: magic/ver = CAFED00D/160.1 should be CAFED00D/150.7
 *   http://bugs.sun.com/view_bug.do?bug_id=6712743
 * 
 * Create the class file as follows:
 * 
 *   javac -target 5 FixPack200.java
 * 
 * Insert the class file into a jar as follows:
 * 
 *   jar uvf foo.jar FixPack200.class
 */

public class FixPack200 {}