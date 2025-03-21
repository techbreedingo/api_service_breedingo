const PregEasyEvent = require('../models/pregEasyEvent');
const PregEasy = require('../models/pregEasy');

// Helper function to calculate event dates based on delivery date
const calculateEventDates = (deliveryDate) => {
  const medicineDate = new Date(deliveryDate);
  medicineDate.setDate(medicineDate.getDate() + 15); // 15 days after delivery

  const dewormingDate = new Date(deliveryDate);
  dewormingDate.setDate(dewormingDate.getDate() + 20); // 20 days after delivery

  const firstHeatDate = new Date(deliveryDate);
  firstHeatDate.setDate(firstHeatDate.getDate() + 35); // 35 days after delivery (minimum)

  return {
    medicineDate,
    dewormingDate,
    firstHeatDate
  };
};

// Create initial events for a new cattle
const createInitialEvents = async (req, res) => {
  try {
    const { pregEasyId } = req.body;
    const userId = req.user.userId;

    if (!pregEasyId) {
      return res.status(400).json({
        success: false,
        message: "pregEasyId is required in request body"
      });
    }

    // Find cattle using MongoDB _id since that's what we're getting from the frontend
    const cattle = await PregEasy.findById(pregEasyId);
    if (!cattle) {
      return res.status(404).json({
        success: false,
        message: "Cattle not found"
      });
    }

    // Verify the cattle belongs to the user
    if (cattle.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized - This cattle does not belong to you"
      });
    }

    const eventDates = calculateEventDates(cattle.dateOfLastDelivery);

    try {
      // Create a single document with all three events
      const eventDocument = new PregEasyEvent({
        userId,
        pregEasyId: cattle._id, // Use MongoDB _id
        events: [
          {
            eventType: 'medicine',
            title: 'Uterus Checking',
            description: 'Check the condition in Uterus (15 days after delivery)',
            scheduledDate: eventDates.medicineDate,
          },
          {
            eventType: 'deworming',
            title: 'Deworming',
            description: 'Deworming medicine needs to be given (20 days after delivery)',
            scheduledDate: eventDates.dewormingDate,
          },
          {
            eventType: 'first_heat',
            title: 'First Heat',
            description: 'Record the date when first heat is detected (35-60 days from Delivery)',
            scheduledDate: eventDates.firstHeatDate,
          }
        ]
      });

      const savedDocument = await eventDocument.save();

      res.status(201).json({
        success: true,
        message: "Initial events created successfully",
        data: savedDocument
      });

    } catch (error) {
      console.error('Error in createInitialEvents:', error);
      res.status(500).json({
        success: false,
        message: "Failed to create initial events",
        error: error.message
      });
    }

  } catch (error) {
    console.error('Error in createInitialEvents:', error);
    res.status(500).json({
      success: false,
      message: "Failed to create initial events",
      error: error.message
    });
  }
};

// Get all events for a specific cattle
const getCattleEvents = async (req, res) => {
  try {
    const { pregEasyId } = req.query;
    const userId = req.user.userId;

    if (!pregEasyId) {
      return res.status(400).json({
        success: false,
        message: "pregEasyId is required as a query parameter"
      });
    }

    const events = await PregEasyEvent.findOne({ 
      pregEasyId, 
      userId 
    });

    res.status(200).json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('Error in getCattleEvents:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message
    });
  }
};

// Update event status
const updateEventStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { eventIndex, status, completedDate, aiStatus, semenBullDetails, heatDate } = req.body;
    const userId = req.user.userId;

    const eventDoc = await PregEasyEvent.findOne({ 
      _id: eventId,
      userId 
    });

    if (!eventDoc) {
      return res.status(404).json({
        success: false,
        message: "Event document not found or unauthorized"
      });
    }

    if (eventIndex < 0 || eventIndex >= eventDoc.events.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid event index"
      });
    }

    // Update the specific event in the array
    eventDoc.events[eventIndex].status = status;
    if (completedDate) {
      eventDoc.events[eventIndex].completedDate = new Date(completedDate);
    }
    
    // Update AI status and semen details if provided
    if (aiStatus) {
      eventDoc.events[eventIndex].aiStatus = aiStatus;
    }
    
    if (semenBullDetails) {
      eventDoc.events[eventIndex].semenBullDetails = semenBullDetails;
    }
    
    // Update heat date if provided
    if (heatDate) {
      eventDoc.events[eventIndex].heatDate = new Date(heatDate);
    }
    
    eventDoc.events[eventIndex].updatedAt = new Date();

    // If this is a first_heat event and AI was performed, create follow-up events
    if (eventDoc.events[eventIndex].eventType === 'first_heat' && 
        aiStatus === 'done' && 
        heatDate) {
      
      const aiDate = new Date(heatDate);
      
      // Check if Heat Check Before PD event already exists
      const existingHeatCheck = eventDoc.events.find(e => 
        e.eventType === 'heat_check_before_pd' && 
        e.status === 'pending'
      );
      
      // Check if PD Check event already exists
      const existingPDCheck = eventDoc.events.find(e => 
        e.eventType === 'pd_check' && 
        e.status === 'pending'
      );
      
      // Only create Heat Check Before PD if it doesn't exist
      if (!existingHeatCheck) {
        // Create Heat Check Before PD event (21 days after AI)
        const heatCheckDate = new Date(aiDate);
        heatCheckDate.setDate(heatCheckDate.getDate() + 21);
        
        eventDoc.events.push({
          eventType: 'heat_check_before_pd',
          title: 'Heat Check Before PD',
          description: 'Check if heat signs are visible before PD Check',
          scheduledDate: heatCheckDate,
          status: 'pending',
          aiStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Only create PD Check if it doesn't exist
      if (!existingPDCheck) {
        // Create PD Check event (35 days after AI)
        const pdCheckDate = new Date(aiDate);
        pdCheckDate.setDate(pdCheckDate.getDate() + 35);
        
        eventDoc.events.push({
          eventType: 'pd_check',
          title: 'Pregnancy Detection',
          description: 'Conduct pregnancy diagnosis',
          scheduledDate: pdCheckDate,
          status: 'pending',
          aiStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    // If this is a first_heat event and NO AI was performed, create next heat cycle
    else if (eventDoc.events[eventIndex].eventType === 'first_heat' && 
             aiStatus === 'not_done' && 
             heatDate) {
      
      const heatDateObj = new Date(heatDate);
      
      // Check if Heat Cycle 2 already exists
      const existingHeatCycle = eventDoc.events.find(e => 
        e.eventType === 'heat_cycle' && 
        e.status === 'pending' &&
        e.title === 'Heat Cycle 2'
      );
      
      // Only create Heat Cycle 2 if it doesn't exist
      if (!existingHeatCycle) {
        // Create Heat Cycle 2 event (21 days after heat detection)
        const nextHeatDate = new Date(heatDateObj);
        nextHeatDate.setDate(nextHeatDate.getDate() + 21);
        
        eventDoc.events.push({
          eventType: 'heat_cycle',
          title: 'Heat Cycle 2',
          description: 'Check for heat signs',
          scheduledDate: nextHeatDate,
          status: 'pending',
          aiStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    await eventDoc.save();

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: eventDoc
    });

  } catch (error) {
    console.error('Error in updateEventStatus:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update event",
      error: error.message
    });
  }
};

// Update heat check before PD
const updateHeatCheckBeforePD = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { eventIndex, status, completedDate, heatVisible, aiStatus, semenBullDetails } = req.body;
    const userId = req.user.userId;

    console.log('updateHeatCheckBeforePD called with:', {
      eventId,
      userId,
      eventIndex,
      status,
      completedDate,
      heatVisible,
      aiStatus,
      semenBullDetails
    });

    const eventDoc = await PregEasyEvent.findOne({ 
      _id: eventId,
      userId 
    });

    if (!eventDoc) {
      console.log('Event document not found with criteria:', {
        _id: eventId,
        userId
      });
      return res.status(404).json({
        success: false,
        message: "Event document not found or unauthorized"
      });
    }

    if (eventIndex < 0 || eventIndex >= eventDoc.events.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid event index"
      });
    }

    // Update the heat check event
    eventDoc.events[eventIndex].status = status;
    if (completedDate) {
      eventDoc.events[eventIndex].completedDate = new Date(completedDate);
    }
    
    // Update heat visibility
    if (heatVisible !== undefined) {
      eventDoc.events[eventIndex].heatVisible = heatVisible;
    }
    
    // Update AI status if provided
    if (aiStatus) {
      eventDoc.events[eventIndex].aiStatus = aiStatus;
    }
    
    // Update semen bull details if provided
    if (semenBullDetails) {
      eventDoc.events[eventIndex].semenBullDetails = semenBullDetails;
    }
    
    eventDoc.events[eventIndex].updatedAt = new Date();

    // If this is a heat_check_before_pd event or heat_cycle event and AI was performed, create follow-up events
    if ((eventDoc.events[eventIndex].eventType === 'heat_check_before_pd' || 
         eventDoc.events[eventIndex].eventType === 'heat_cycle') && 
        aiStatus === 'done' && 
        completedDate) {
      
      console.log(`\n=== Debug ${eventDoc.events[eventIndex].eventType} with AI ===`);
      console.log('Event:', eventDoc.events[eventIndex]);
      console.log('AI Status:', aiStatus);
      console.log('Completed Date:', completedDate);
      console.log('Semen Bull Details:', semenBullDetails);
      
      const aiDate = new Date(completedDate);
      
      // Find the current cycle number
      let currentCycleNumber = 1;
      
      // First, check if there's a first_heat event that's completed
      const firstHeatEvent = eventDoc.events.find(e => 
        e.eventType === 'first_heat' && e.status === 'completed'
      );
      
      if (firstHeatEvent) {
        // If we have a completed first_heat event, start counting from 1
        console.log('First heat event found, setting base cycle number to 1');
        
        // Now count how many completed heat_cycle events we have
        const completedHeatCycles = eventDoc.events.filter(e => 
          e.eventType === 'heat_cycle' && e.status === 'completed'
        );
        
        // Include the current event if it's being completed now
        let completedCount = completedHeatCycles.length;
        
        // If this is a Heat Check Before PD that's being completed with AI,
        // we need to account for the new Heat Cycle that will be created
        if (eventDoc.events[eventIndex].eventType === 'heat_check_before_pd' && 
            aiStatus === 'done' && completedDate) {
          console.log(`${eventDoc.events[eventIndex].eventType} with AI is being completed, adding to cycle count`);
          completedCount += 1;
        }
        
        // The current cycle number should be 1 (first heat) + number of completed heat cycles
        currentCycleNumber = 1 + completedCount;
        console.log(`Found ${completedHeatCycles.length} completed heat cycles, adding current event: ${completedCount}, setting cycle number to ${currentCycleNumber}`);
      } else if (eventDoc.events[eventIndex].cycleNumber) {
        // If the current event has a cycle number, use it
        currentCycleNumber = eventDoc.events[eventIndex].cycleNumber;
        console.log('Using cycle number from event:', currentCycleNumber);
      } else {
        // Otherwise, check if there's a completed first_heat event
        const firstHeatEvent = eventDoc.events.find(e => 
          e.eventType === 'first_heat' && e.status === 'completed'
        );
        
        if (firstHeatEvent) {
          console.log('Found completed first_heat event:', firstHeatEvent);
          
          // If first_heat exists and has AI done, we're at least at cycle 2
          if (firstHeatEvent.aiStatus === 'done') {
            currentCycleNumber = 2;
            console.log('First heat has AI done, setting base cycle number to 2');
          }
        }
        
        // Find all completed Heat Cycle events
        const completedHeatCycles = eventDoc.events
          .filter(e => e.eventType === 'heat_cycle' && e.status === 'completed')
          .sort((a, b) => new Date(b.completedDate || b.updatedAt) - new Date(a.completedDate || a.updatedAt));
        
        console.log(`Found ${completedHeatCycles.length} completed heat cycles`);
        
        if (completedHeatCycles.length > 0) {
          // If we have completed heat cycles, use the highest cycle number + 1
          let highestCycleNumber = 1;
          
          for (const cycle of completedHeatCycles) {
            console.log('Checking cycle:', cycle.title, cycle.cycleNumber);
            
            let cycleNum = 1;
            
            // Try to get cycle number from the cycleNumber property
            if (cycle.cycleNumber) {
              cycleNum = parseInt(cycle.cycleNumber);
            } 
            // If cycleNumber property doesn't exist, try to extract from title
            else if (cycle.title) {
              const titleMatch = cycle.title.match(/Heat Cycle (\d+)/);
              if (titleMatch && titleMatch[1]) {
                cycleNum = parseInt(titleMatch[1]);
              }
            }
            
            if (cycleNum > highestCycleNumber) {
              highestCycleNumber = cycleNum;
            }
          }
          
          // Set the new cycle number to be one higher than the highest existing cycle
          currentCycleNumber = highestCycleNumber + 1;
          console.log(`Highest existing cycle number: ${highestCycleNumber}, new cycle number: ${currentCycleNumber}`);
        } else if (firstHeatEvent && firstHeatEvent.aiStatus === 'done') {
          // If no completed heat cycles but first heat with AI done, we're at cycle 2
          currentCycleNumber = 2;
          console.log('No completed heat cycles, but first heat with AI done, setting cycle number to 2');
        }
      }
      
      console.log('Final cycle number for new Heat Cycle event:', currentCycleNumber);
      
      // Mark the event as completed with the provided AI status
      eventDoc.events[eventIndex].status = 'completed';
      eventDoc.events[eventIndex].aiStatus = aiStatus;
      eventDoc.events[eventIndex].completedDate = new Date(completedDate);
      eventDoc.events[eventIndex].semenBullDetails = semenBullDetails;
      eventDoc.events[eventIndex].updatedAt = new Date();
      
      // For Heat Check Before PD events, create a completed Heat Cycle event
      // For Heat Cycle events, just update the existing event
      if (eventDoc.events[eventIndex].eventType === 'heat_check_before_pd') {
        // Create a completed Heat Cycle event with the current cycle number
        const heatCycleEvent = {
          eventType: 'heat_cycle',
          title: `Heat Cycle ${currentCycleNumber}`,
          description: `AI PERFORMED${semenBullDetails ? ` - Bull: ${semenBullDetails}` : ''}`,
          scheduledDate: new Date(completedDate),
          completedDate: new Date(completedDate),
          status: 'completed',
          aiStatus: 'done',
          semenBullDetails: semenBullDetails,
          cycleNumber: currentCycleNumber,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        console.log('Created Heat Cycle event:', heatCycleEvent);
        
        // Add the completed Heat Cycle event
        eventDoc.events.push(heatCycleEvent);
      } else if (eventDoc.events[eventIndex].eventType === 'heat_cycle') {
        // For Heat Cycle events, just update the description to indicate AI was performed
        eventDoc.events[eventIndex].description = `AI PERFORMED${semenBullDetails ? ` - Bull: ${semenBullDetails}` : ''}`;
        console.log('Updated existing Heat Cycle event description');
      }
      
      // Delete any existing pending Heat Check Before PD and PD Check events
      const pendingEventsToRemove = eventDoc.events.filter(e => 
        (e.eventType === 'heat_check_before_pd' || e.eventType === 'pd_check') && 
        e.status === 'pending' &&
        e._id.toString() !== eventDoc.events[eventIndex]._id.toString() // Don't remove the current event
      );
      
      console.log(`Found ${pendingEventsToRemove.length} pending events to remove`);
      
      // Remove the pending events
      for (const eventToRemove of pendingEventsToRemove) {
        const removeIndex = eventDoc.events.findIndex(e => 
          e._id.toString() === eventToRemove._id.toString()
        );
        
        if (removeIndex !== -1) {
          console.log(`Removing pending event: ${eventToRemove.eventType} - ${eventToRemove.title}`);
          eventDoc.events.splice(removeIndex, 1);
        }
      }
      
      // Check if Heat Check Before PD event already exists for this AI
      const existingHeatCheck = eventDoc.events.find(e => 
        e.eventType === 'heat_check_before_pd' && 
        e.status === 'pending' &&
        e.createdAt > new Date(completedDate) // Only check for events created after this AI
      );
      
      // Check if PD Check event already exists for this AI
      const existingPDCheck = eventDoc.events.find(e => 
        e.eventType === 'pd_check' && 
        e.status === 'pending' &&
        e.createdAt > new Date(completedDate) // Only check for events created after this AI
      );
      
      // Only create Heat Check Before PD if it doesn't exist
      if (!existingHeatCheck) {
        // Create Heat Check Before PD event (21 days after AI)
        const heatCheckDate = new Date(aiDate);
        heatCheckDate.setDate(heatCheckDate.getDate() + 21);
        
        eventDoc.events.push({
          eventType: 'heat_check_before_pd',
          title: 'Heat Check Before PD',
          description: 'Check if heat signs are visible before PD Check',
          scheduledDate: heatCheckDate,
          status: 'pending',
          aiStatus: 'pending',
          cycleNumber: currentCycleNumber,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Only create PD Check if it doesn't exist
      if (!existingPDCheck) {
        // Create PD Check event (35 days after AI)
        const pdCheckDate = new Date(aiDate);
        pdCheckDate.setDate(pdCheckDate.getDate() + 35);
        
        eventDoc.events.push({
          eventType: 'pd_check',
          title: 'Pregnancy Detection',
          description: 'Conduct pregnancy diagnosis',
          scheduledDate: pdCheckDate,
          status: 'pending',
          aiStatus: 'pending',
          cycleNumber: currentCycleNumber,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    // If this is a heat_check_before_pd event or heat_cycle event and NO AI was performed, create next heat cycle
    else if ((eventDoc.events[eventIndex].eventType === 'heat_check_before_pd' || 
              eventDoc.events[eventIndex].eventType === 'heat_cycle') && 
             aiStatus === 'not_done' && 
             completedDate) {
      
      console.log(`\n=== Debug ${eventDoc.events[eventIndex].eventType} with No AI ===`);
      console.log('Event:', eventDoc.events[eventIndex]);
      console.log('AI Status:', aiStatus);
      console.log('Completed Date:', completedDate);
      
      const heatDateObj = new Date(completedDate);
      
      // For Heat Check Before PD events, we need to get the correct cycle number
      // This should be the current cycle number from the Heat Check Before PD event
      let heatCycleCycleNumber = 1; // Default to 1
      
      // If this is a Heat Cycle event, use its cycle number for calculations
      if (eventDoc.events[eventIndex].eventType === 'heat_cycle' && eventDoc.events[eventIndex].cycleNumber) {
        heatCycleCycleNumber = eventDoc.events[eventIndex].cycleNumber;
        console.log('Using current Heat Cycle event cycle number:', heatCycleCycleNumber);
      } else {
        // Otherwise, check if there's a completed first_heat event
        const firstHeatEvent = eventDoc.events.find(e => 
          e.eventType === 'first_heat' && e.status === 'completed'
        );
        
        if (firstHeatEvent) {
          console.log('Found completed first_heat event:', firstHeatEvent);
          
          // If first_heat exists and has AI done, we're at least at cycle 2
          if (firstHeatEvent.aiStatus === 'done') {
            heatCycleCycleNumber = 2;
            console.log('First heat has AI done, setting base cycle number to 2');
          }
        }
        
        // Find all completed Heat Cycle events
        const completedHeatCycles = eventDoc.events
          .filter(e => e.eventType === 'heat_cycle' && e.status === 'completed')
          .sort((a, b) => new Date(b.completedDate || b.updatedAt) - new Date(a.completedDate || a.updatedAt));
        
        console.log(`Found ${completedHeatCycles.length} completed heat cycles`);
        
        if (completedHeatCycles.length > 0) {
          // If we have completed heat cycles, use the highest cycle number + 1
          let highestCycleNumber = 1;
          
          for (const cycle of completedHeatCycles) {
            console.log('Checking cycle:', cycle.title, cycle.cycleNumber);
            
            let cycleNum = 1;
            
            // Try to get cycle number from the cycleNumber property
            if (cycle.cycleNumber) {
              cycleNum = parseInt(cycle.cycleNumber);
            } 
            // If cycleNumber property doesn't exist, try to extract from title
            else if (cycle.title) {
              const titleMatch = cycle.title.match(/Heat Cycle (\d+)/);
              if (titleMatch && titleMatch[1]) {
                cycleNum = parseInt(titleMatch[1]);
              }
            }
            
            if (cycleNum > highestCycleNumber) {
              highestCycleNumber = cycleNum;
            }
          }
          
          // Set the new cycle number to be one higher than the highest existing cycle
          heatCycleCycleNumber = highestCycleNumber + 1;
          console.log(`Highest existing cycle number: ${highestCycleNumber}, new cycle number: ${heatCycleCycleNumber}`);
        } else if (firstHeatEvent && firstHeatEvent.aiStatus === 'done') {
          // If no completed heat cycles but first heat with AI done, we're at cycle 2
          heatCycleCycleNumber = 2;
          console.log('No completed heat cycles, but first heat with AI done, setting cycle number to 2');
        }
      }
      
      console.log('Final cycle number for Heat Cycle event with No Heat Signs:', heatCycleCycleNumber);
      
      // If this is a Heat Cycle with no AI, remove any pending Heat Cycle events
      // that were created after this one to avoid cycle number skipping
      const isHeatCycleWithNoAI = eventDoc.events[eventIndex].eventType === 'heat_cycle' && aiStatus === 'not_done';
      if (isHeatCycleWithNoAI) {
        // Get the current cycle number from the event
        if (eventDoc.events[eventIndex].cycleNumber) {
          heatCycleCycleNumber = parseInt(eventDoc.events[eventIndex].cycleNumber);
        } else if (eventDoc.events[eventIndex].title) {
          const titleMatch = eventDoc.events[eventIndex].title.match(/Heat Cycle (\d+)/);
          if (titleMatch && titleMatch[1]) {
            heatCycleCycleNumber = parseInt(titleMatch[1]);
          }
        }
        
        console.log('Cleaning up pending Heat Cycles after cycle number:', heatCycleCycleNumber);
        
        // First find all pending Heat Cycles with higher cycle numbers
        const pendingCyclesToRemove = eventDoc.events.filter(e => {
          if (e.eventType === 'heat_cycle' && e.status === 'pending') {
            // Extract cycle number from title if cycleNumber property is undefined
            let cycleNum = e.cycleNumber;
            if (cycleNum === undefined && e.title) {
              const titleMatch = e.title.match(/Heat Cycle (\d+)/);
              if (titleMatch && titleMatch[1]) {
                cycleNum = parseInt(titleMatch[1]);
              }
            }
            return cycleNum > heatCycleCycleNumber;
          }
          return false;
        });
        
        // Log what we're about to remove
        pendingCyclesToRemove.forEach(e => {
          console.log('Will remove pending Heat Cycle:', e.title);
        });
        
        // Remove the pending cycles
        eventDoc.events = eventDoc.events.filter(e => {
          if (e.eventType === 'heat_cycle' && e.status === 'pending') {
            // Extract cycle number from title if cycleNumber property is undefined
            let cycleNum = e.cycleNumber;
            if (cycleNum === undefined && e.title) {
              const titleMatch = e.title.match(/Heat Cycle (\d+)/);
              if (titleMatch && titleMatch[1]) {
                cycleNum = parseInt(titleMatch[1]);
              }
            }
            
            const shouldRemove = cycleNum > heatCycleCycleNumber;
            if (shouldRemove) {
              console.log('Removing Heat Cycle:', e.title, 'with cycle number:', cycleNum);
            }
            return !shouldRemove;
          }
          return true;
        });
      }
      
      // For Heat Check Before PD with No Heat Signs, create a completed Heat Cycle event
      // and keep the PD Check event
      if (eventDoc.events[eventIndex].eventType === 'heat_check_before_pd' && aiStatus === 'not_done') {
        console.log('Heat Check Before PD with No AI. Heat Signs Visible:', eventDoc.events[eventIndex].heatVisible);
        
        // First, determine the correct cycle number for the completed Heat Cycle
        let cycleNumber = heatCycleCycleNumber;
        
        // Extract cycle number from the Heat Check Before PD event if available
        if (eventDoc.events[eventIndex].cycleNumber) {
          cycleNumber = eventDoc.events[eventIndex].cycleNumber;
          console.log('Using cycle number from Heat Check Before PD event:', cycleNumber);
        } else {
          console.log('Using calculated cycle number for Heat Cycle:', cycleNumber);
        }
        
        console.log('Creating completed Heat Cycle with cycle number:', cycleNumber);
        
        // Clean up any pending Heat Cycles with higher cycle numbers
        console.log('Cleaning up pending Heat Cycles after cycle number:', cycleNumber);
        
        // First find all pending Heat Cycles with higher cycle numbers
        const pendingCyclesToRemove = eventDoc.events.filter(e => {
          if (e.eventType === 'heat_cycle' && e.status === 'pending') {
            // Extract cycle number from title if cycleNumber property is undefined
            let cycleNum = e.cycleNumber;
            if (cycleNum === undefined && e.title) {
              const titleMatch = e.title.match(/Heat Cycle (\d+)/);
              if (titleMatch && titleMatch[1]) {
                cycleNum = parseInt(titleMatch[1]);
              }
            }
            return cycleNum > cycleNumber;
          }
          return false;
        });
        
        // Log what we're about to remove
        pendingCyclesToRemove.forEach(e => {
          console.log('Will remove pending Heat Cycle:', e.title);
        });
        
        // Remove the pending cycles
        eventDoc.events = eventDoc.events.filter(e => {
          if (e.eventType === 'heat_cycle' && e.status === 'pending') {
            // Extract cycle number from title if cycleNumber property is undefined
            let cycleNum = e.cycleNumber;
            if (cycleNum === undefined && e.title) {
              const titleMatch = e.title.match(/Heat Cycle (\d+)/);
              if (titleMatch && titleMatch[1]) {
                cycleNum = parseInt(titleMatch[1]);
              }
            }
            
            const shouldRemove = cycleNum > cycleNumber;
            if (shouldRemove) {
              console.log('Removing Heat Cycle:', e.title, 'with cycle number:', cycleNum);
            }
            return !shouldRemove;
          }
          return true;
        });
        
        // Mark associated PD Check events with a flag to not render them
        eventDoc.events.forEach(e => {
          if (e.eventType === 'pd_check' && e.cycleNumber === cycleNumber) {
            console.log('Marking PD Check event to not render:', e.title);
            e.doNotRender = true;
          }
        });
        
        // Create a completed Heat Cycle event with the correct cycle number
        const heatCycleEvent = {
          eventType: 'heat_cycle',
          title: `Heat Cycle ${cycleNumber}`,
          description: eventDoc.events[eventIndex].heatVisible ? 'HEAT SIGNS VISIBLE - NO AI PERFORMED' : 'NO HEAT SIGNS DETECTED',
          scheduledDate: new Date(completedDate),
          completedDate: new Date(completedDate),
          status: 'completed',
          aiStatus: 'not_done',
          cycleNumber: cycleNumber,
          heatSigns: eventDoc.events[eventIndex].heatSigns || [],
          heatVisible: eventDoc.events[eventIndex].heatVisible || false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Add the completed Heat Cycle event
        eventDoc.events.push(heatCycleEvent);
        
        // Only create next Heat Cycle if Heat Signs were visible
        if (eventDoc.events[eventIndex].heatVisible) {
          // Create next Heat Cycle event (21 days after current heat detection)
          const nextHeatCycleDate = new Date(heatDateObj);
          nextHeatCycleDate.setDate(nextHeatCycleDate.getDate() + 21);
          
          // Create end date (2 days after start)
          const nextHeatCycleEndDate = new Date(nextHeatCycleDate);
          nextHeatCycleEndDate.setDate(nextHeatCycleEndDate.getDate() + 2);
          
          // For Heat Check Before PD with no AI, increment the cycle number
          const nextCycleNumber = cycleNumber + 1;
          
          console.log('Creating next Heat Cycle with cycle number:', nextCycleNumber);
          
          eventDoc.events.push({
            eventType: 'heat_cycle',
            title: `Heat Cycle ${nextCycleNumber}`,
            description: 'Check for heat signs',
            scheduledDate: nextHeatCycleDate,
            scheduledEndDate: nextHeatCycleEndDate,
            status: 'pending',
            aiStatus: 'pending',
            heatSigns: [],
            heatVisible: false,
            cycleNumber: nextCycleNumber,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          console.log('No Heat Signs detected, not creating next Heat Cycle');
        }
      } else {
        // For Heat Cycle with no AI, create next heat cycle
        // Create next Heat Cycle event (21 days after current heat detection)
        const nextHeatCycleDate = new Date(heatDateObj);
        nextHeatCycleDate.setDate(nextHeatCycleDate.getDate() + 21);
        
        // Create end date (2 days after start)
        const nextHeatCycleEndDate = new Date(nextHeatCycleDate);
        nextHeatCycleEndDate.setDate(nextHeatCycleEndDate.getDate() + 2);
        
        // For Heat Cycle with no AI, increment the cycle number
        const nextCycleNumber = heatCycleCycleNumber + 1;
        
        console.log('Creating next Heat Cycle with cycle number:', nextCycleNumber);
        
        eventDoc.events.push({
          eventType: 'heat_cycle',
          title: `Heat Cycle ${nextCycleNumber}`,
          description: 'Check for heat signs',
          scheduledDate: nextHeatCycleDate,
          scheduledEndDate: nextHeatCycleEndDate,
          status: 'pending',
          aiStatus: 'pending',
          heatSigns: [],
          heatVisible: false,
          cycleNumber: nextCycleNumber,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    await eventDoc.save();

    res.status(200).json({
      success: true,
      message: "Heat check updated successfully",
      data: eventDoc
    });

  } catch (error) {
    console.error('Error in updateHeatCheckBeforePD:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update heat check",
      error: error.message
    });
  }
};

// Update PD Check event
const updatePDCheck = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { eventIndex, status, completedDate, isPregnant, animalType } = req.body;

    // Validate required fields
    if (!eventId || eventIndex === undefined || !status || !completedDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Find the event document
    const eventDoc = await PregEasyEvent.findById(eventId);
    if (!eventDoc) {
      return res.status(404).json({
        success: false,
        message: 'Event document not found'
      });
    }

    // Update the PD Check event
    if (eventDoc.events[eventIndex]) {
      eventDoc.events[eventIndex].status = status;
      eventDoc.events[eventIndex].completedDate = completedDate;
      eventDoc.events[eventIndex].isPregnant = isPregnant;
    } else {
      return res.status(404).json({
        success: false,
        message: 'Event not found at specified index'
      });
    }

    // If pregnant, create an expected delivery event
    if (isPregnant) {
      // Find the last AI event (first_heat or heat_cycle with aiStatus="done")
      const lastAIEvent = eventDoc.events
        .filter(event => (event.eventType === 'first_heat' || event.eventType === 'heat_cycle') && event.aiStatus === 'done')
        .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))[0];

      if (!lastAIEvent) {
        return res.status(400).json({
          success: false,
          message: 'No AI event found to calculate expected delivery date'
        });
      }

      // Calculate expected delivery date based on animal type
      let expectedDeliveryDate;
      if (animalType === 'buffalo') {
        // For buffalo: 10 months and 10 days
        expectedDeliveryDate = new Date(lastAIEvent.completedDate);
        expectedDeliveryDate.setMonth(expectedDeliveryDate.getMonth() + 10);
        expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 10);
      } else {
        // For cow: 9 months and 9 days
        expectedDeliveryDate = new Date(lastAIEvent.completedDate);
        expectedDeliveryDate.setMonth(expectedDeliveryDate.getMonth() + 9);
        expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 9);
      }

      // Create expected delivery event
      eventDoc.events.push({
        title: 'Expected Delivery',
        description: 'Expected delivery date based on AI and pregnancy confirmation',
        eventType: 'expected_delivery', // Changed from 'pd_check' to the new valid enum value
        status: 'pending',
        scheduledDate: expectedDeliveryDate,
        aiDate: lastAIEvent.completedDate,
        pdCheckDate: completedDate,
        animalType: animalType
      });
    } else {
      // If not pregnant, create a new Heat Cycle event based on the 21-day cycle from the last AI date
      
      // Find the last AI event (first_heat or heat_cycle with aiStatus="done")
      const lastAIEvent = eventDoc.events
        .filter(event => (event.eventType === 'first_heat' || event.eventType === 'heat_cycle') && event.aiStatus === 'done')
        .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))[0];
      
      if (!lastAIEvent) {
        return res.status(400).json({
          success: false,
          message: 'No AI event found to calculate next heat cycle date'
        });
      }
      
      // Calculate the next heat cycle date based on multiples of 21 days from the last AI date
      const lastAIDate = new Date(lastAIEvent.completedDate);
      const daysSinceLastAI = Math.floor((new Date(completedDate) - lastAIDate) / (1000 * 60 * 60 * 24));
      const cyclesPassed = Math.floor(daysSinceLastAI / 21);
      const nextCycleNumber = cyclesPassed + 2; // +1 for the current cycle, +1 for the next cycle
      
      // Calculate the next heat date as the next 21-day mark from the last AI date
      const nextHeatDate = new Date(lastAIDate);
      nextHeatDate.setDate(nextHeatDate.getDate() + ((cyclesPassed + 1) * 21));
      
      // Set the end date as the day after the start date
      const nextHeatEndDate = new Date(nextHeatDate);
      nextHeatEndDate.setDate(nextHeatEndDate.getDate() + 1);
      
      // Find the last heat cycle to get the cycle number
      const heatCycles = eventDoc.events.filter(event => event.eventType === 'heat_cycle');
      const cycleNumber = heatCycles.length > 0 ? 
        Math.max(parseInt(heatCycles[heatCycles.length - 1].title.split(' ')[2]) + 1, nextCycleNumber) : 
        nextCycleNumber;
      
      eventDoc.events.push({
        title: `Heat Cycle ${cycleNumber}`,
        description: 'Next expected heat cycle after not pregnant result',
        eventType: 'heat_cycle',
        status: 'pending',
        scheduledDate: nextHeatDate,
        dateEnd: nextHeatEndDate,
        aiStatus: 'pending',
        animalType: animalType
      });
    }

    // Save the updated document
    await eventDoc.save();

    return res.status(200).json({
      success: true,
      message: isPregnant ? 'PD Check completed and Expected Delivery event created' : 'PD Check completed and new Heat Cycle event created',
      data: eventDoc
    });
  } catch (error) {
    console.warn('Error updating PD Check event:', error);
    return res.status(500).json({
      success: false,
      message: `Error updating PD Check event: ${error.message}`
    });
  }
};

module.exports = {
  createInitialEvents,
  getCattleEvents,
  updateEventStatus,
  updateHeatCheckBeforePD,
  updatePDCheck
};
